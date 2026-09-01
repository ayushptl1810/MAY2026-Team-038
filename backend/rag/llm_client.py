from __future__ import annotations

import requests

from config import settings

EMBEDDINGS_URL = "https://integrate.api.nvidia.com/v1/embeddings"
CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

EMBEDDING_MODEL = "nvidia/nemotron-3-embed-1b"
GENERATION_MODEL = "nvidia/nemotron-3-super-120b-a12b"

TIMEOUT_SECONDS = 30


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.nvidia_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def embed_texts(texts: list[str], input_type: str) -> list[list[float]]:
    """input_type must be 'query' (embedding a user question) or 'passage'
    (embedding a site chunk during indexing) - nv-embedqa-e5-v5 is an
    asymmetric retrieval model and gives poor results if these are swapped."""
    all_embeddings = []
    # Batch requests into chunks of 50 to avoid API limits (400 Bad Request)
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        response = requests.post(
            EMBEDDINGS_URL,
            headers=_headers(),
            json={"input": batch_texts, "model": EMBEDDING_MODEL, "input_type": input_type, "encoding_format": "float", "truncate": "END"},
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()["data"]
        ordered = sorted(data, key=lambda item: item["index"])
        all_embeddings.extend([item["embedding"] for item in ordered])
    return all_embeddings


def generate_answer(messages: list[dict[str, str]], max_tokens: int = 1024) -> str:
    response = requests.post(
        CHAT_URL,
        headers=_headers(),
        json={
            "model": GENERATION_MODEL,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": max_tokens,
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
