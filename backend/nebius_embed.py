"""Nebius embedding — used at /teach time to generate + log embeddings."""
import os
from openai import OpenAI
from logger import log_nebius_embed

NEBIUS_BASE = "https://api.studio.nebius.ai/v1"
EMBED_MODEL = "Qwen/Qwen3-Embedding-8B"

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=NEBIUS_BASE,
            api_key=os.environ["NEBIUS_API_KEY"],
        )
    return _client


def embed_text(text: str) -> list[float]:
    """Return embedding vector for text via Nebius."""
    client = get_client()
    response = client.embeddings.create(model=EMBED_MODEL, input=text)
    vec = response.data[0].embedding
    log_nebius_embed(EMBED_MODEL, text, len(vec))
    return vec
