from unittest.mock import patch

import pytest
from fastapi import HTTPException

from rag import chat_service


class _FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self._result = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, query, params=None):
        q = " ".join(query.split()).lower()
        if q.startswith("insert into chat_sessions"):
            row = {
                "id": params["id"], "user_id": params["user_id"],
                "started_at": "now", "ended_at": None,
            }
            self.conn.sessions.append(row)
            self._result = row
        elif q.startswith("select id, user_id, started_at, ended_at from chat_sessions"):
            self._result = next((s for s in self.conn.sessions if s["id"] == params["id"]), None)
        elif q.startswith("select role, content from chat_messages"):
            msgs = [m for m in self.conn.messages if m["session_id"] == params["session_id"]]
            self._result = list(reversed(msgs))[: params["limit"]]
        elif q.startswith(
            "select id, session_id, role, content, referenced_site_ids, created_at"
        ):
            self._result = [m for m in self.conn.messages if m["session_id"] == params["session_id"]]
        elif q.startswith("insert into chat_messages (id, session_id, role, content, created_at)"):
            row = {
                "id": params["id"], "session_id": params["session_id"], "role": "user",
                "content": params["content"], "referenced_site_ids": None, "created_at": "now",
            }
            self.conn.messages.append(row)
            self._result = row
        elif q.startswith(
            "insert into chat_messages (id, session_id, role, content, referenced_site_ids, created_at)"
        ):
            row = {
                "id": params["id"], "session_id": params["session_id"], "role": "assistant",
                "content": params["content"], "referenced_site_ids": params["referenced_site_ids"],
                "created_at": "now",
            }
            self.conn.messages.append(row)
            self._result = row
        else:
            raise NotImplementedError(query)

    def fetchone(self):
        return self._result

    def fetchall(self):
        return self._result


class _FakeConnection:
    def __init__(self):
        self.sessions = []
        self.messages = []
        self.committed = 0

    def cursor(self, cursor_factory=None):
        return _FakeCursor(self)

    def commit(self):
        self.committed += 1


@patch("rag.chat_service.llm_client.generate_answer")
@patch("rag.chat_service.retrieve_relevant_sites")
def test_send_message_persists_user_and_assistant_messages(mock_retrieve, mock_generate):
    mock_retrieve.return_value = [
        {"site_id": "site-1", "name": "Shaniwar Wada", "content_chunk": "...", "distance": 0.1}
    ]
    mock_generate.return_value = "Shaniwar Wada was built in 1732."
    conn = _FakeConnection()
    session = chat_service.create_session(conn, user_id="user-1")

    reply = chat_service.send_message(
        conn, session["id"], "user-1", "Tell me about Shaniwar Wada"
    )

    assert reply["role"] == "assistant"
    assert reply["content"] == "Shaniwar Wada was built in 1732."
    assert reply["referenced_site_ids"] == ["site-1"]
    assert [m["role"] for m in conn.messages] == ["user", "assistant"]


@patch("rag.chat_service.llm_client.generate_answer")
@patch("rag.chat_service.retrieve_relevant_sites")
def test_send_message_prompt_instructs_concise_answers(mock_retrieve, mock_generate):
    mock_retrieve.return_value = [
        {"site_id": "site-1", "name": "Shaniwar Wada", "content_chunk": "Built 1732.", "distance": 0.1}
    ]
    mock_generate.return_value = "Built in 1732."
    conn = _FakeConnection()
    session = chat_service.create_session(conn, user_id="user-1")

    chat_service.send_message(conn, session["id"], "user-1", "When was Shaniwar Wada built?")

    prompt = mock_generate.call_args[0][0]
    system = prompt[0]["content"].lower()
    assert prompt[0]["role"] == "system"
    assert "concise" in system
    assert "2-4 sentences" in system
    assert "Built 1732." in prompt[0]["content"]


@patch("rag.chat_service.llm_client.generate_answer")
@patch("rag.chat_service.retrieve_relevant_sites")
def test_send_message_wrong_user_is_rejected(mock_retrieve, mock_generate):
    conn = _FakeConnection()
    session = chat_service.create_session(conn, user_id="user-1")

    with pytest.raises(HTTPException) as exc_info:
        chat_service.send_message(conn, session["id"], "someone-else", "hi")

    assert exc_info.value.status_code == 403
    mock_generate.assert_not_called()


@patch("rag.chat_service.llm_client.generate_answer")
@patch("rag.chat_service.retrieve_relevant_sites")
def test_send_message_keeps_user_message_when_generation_fails(mock_retrieve, mock_generate):
    mock_retrieve.return_value = []
    mock_generate.side_effect = RuntimeError("NIM timed out")
    conn = _FakeConnection()
    session = chat_service.create_session(conn, user_id="user-1")

    with pytest.raises(HTTPException) as exc_info:
        chat_service.send_message(conn, session["id"], "user-1", "hi")

    assert exc_info.value.status_code == 502
    assert len(conn.messages) == 1
    assert conn.messages[0]["role"] == "user"
    assert conn.committed == 1
