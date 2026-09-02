from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status
from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from rag import llm_client
from rag.retrieval import retrieve_relevant_sites

HISTORY_LIMIT = 15

SYSTEM_PROMPT = (
    "You are the Heritage Assistant for INTACH Pune. Answer questions about "
    "Pune's heritage sites using only the site information provided below.\n"
    "Rules:\n"
    "- Be concise. Answer in 2-4 sentences, or a short bullet list when "
    "covering multiple sites. No preamble, no filler, do not restate the "
    "question.\n"
    "- Lead with the answer; get straight to the point.\n"
    "- Cite site names inline when you use their information.\n"
    "- If the provided sites don't answer the question, say so in one "
    "sentence. Never invent facts about a site."
)

CREATE_SESSION = """
INSERT INTO chat_sessions (id, user_id, started_at)
VALUES (%(id)s, %(user_id)s, now())
RETURNING id, user_id, started_at, ended_at
"""

SELECT_SESSION = """
SELECT id, user_id, started_at, ended_at FROM chat_sessions WHERE id = %(id)s
"""

SELECT_RECENT_MESSAGES = """
SELECT role, content FROM chat_messages
WHERE session_id = %(session_id)s
ORDER BY created_at DESC
LIMIT %(limit)s
"""

SELECT_ALL_MESSAGES = """
SELECT id, session_id, role, content, referenced_site_ids, created_at
FROM chat_messages
WHERE session_id = %(session_id)s
ORDER BY created_at ASC
"""

INSERT_USER_MESSAGE = """
INSERT INTO chat_messages (id, session_id, role, content, created_at)
VALUES (%(id)s, %(session_id)s, 'user', %(content)s, now())
RETURNING id, session_id, role, content, referenced_site_ids, created_at
"""

INSERT_ASSISTANT_MESSAGE = """
INSERT INTO chat_messages (id, session_id, role, content, referenced_site_ids, created_at)
VALUES (%(id)s, %(session_id)s, 'assistant', %(content)s, %(referenced_site_ids)s::uuid[], now())
RETURNING id, session_id, role, content, referenced_site_ids, created_at
"""


def create_session(conn: connection, user_id: str | None) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(CREATE_SESSION, {"id": str(uuid4()), "user_id": user_id})
        return cur.fetchone()


def get_owned_session(conn: connection, session_id: str, user_id: str | None) -> dict:
    """A session created by a logged-in user is private to them. A session
    created anonymously (user_id is None) has no owner to protect, so any
    caller holding the session id can use it."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(SELECT_SESSION, {"id": session_id})
        session = cur.fetchone()

    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session["user_id"] is not None and str(session["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
    return session


def list_messages(conn: connection, session_id: str) -> list[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(SELECT_ALL_MESSAGES, {"session_id": session_id})
        return cur.fetchall()


def _build_prompt(history: list[dict], context_sites: list[dict], new_message: str) -> list[dict]:
    context_text = "\n\n".join(site["content_chunk"] for site in context_sites) or (
        "No matching heritage sites were found for this question."
    )
    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nRelevant site information:\n{context_text}",
        }
    ]
    messages.extend({"role": turn["role"], "content": turn["content"]} for turn in history)
    messages.append({"role": "user", "content": new_message})
    return messages


def send_message(conn: connection, session_id: str, user_id: str | None, content: str) -> dict:
    get_owned_session(conn, session_id, user_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            INSERT_USER_MESSAGE,
            {"id": str(uuid4()), "session_id": session_id, "content": content},
        )
        cur.fetchone()
    conn.commit()  # user message survives even if generation below fails

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(SELECT_RECENT_MESSAGES, {"session_id": session_id, "limit": HISTORY_LIMIT})
        history = list(reversed(cur.fetchall()))

    try:
        context_sites = retrieve_relevant_sites(conn, content)
        prompt = _build_prompt(history, context_sites, content)
        answer = llm_client.generate_answer(prompt)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Heritage Assistant is temporarily unavailable",
        ) from exc

    referenced_site_ids = [site["site_id"] for site in context_sites]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            INSERT_ASSISTANT_MESSAGE,
            {
                "id": str(uuid4()),
                "session_id": session_id,
                "content": answer,
                "referenced_site_ids": referenced_site_ids,
            },
        )
        return cur.fetchone()
