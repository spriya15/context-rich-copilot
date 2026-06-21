"""LLM calls via Nebius (OpenAI-compatible) — preference parsing and code review."""
import os
import json
from openai import OpenAI
from logger import logger

NEBIUS_BASE = "https://api.studio.nebius.ai/v1"
MODEL = "meta-llama/Llama-3.3-70B-Instruct"

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=NEBIUS_BASE,
            api_key=os.environ["NEBIUS_API_KEY"],
        )
    return _client


def _chat(prompt: str, max_tokens: int = 1024) -> str:
    client = get_client()
    logger.info(f"[NEBIUS LLM] model={MODEL} prompt='{prompt[:80]}'")
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def parse_preferences(raw_text: str) -> list[dict]:
    """Extract structured preference entries from free-form developer description."""
    prompt = f"""You are parsing a developer's self-description into discrete preference entries for a coding assistant's memory.

Extract every distinct preference, technology choice, or coding style rule from the text below.
Return a JSON array where each element has:
  - "text": one concise preference statement (max 120 chars)
  - "category": one of [language, framework, style, tooling, testing, architecture, other]

Text:
\"\"\"{raw_text}\"\"\"

Return ONLY the JSON array, no explanation."""

    raw = _chat(prompt, max_tokens=1024)
    return json.loads(_strip_fences(raw))


def review_code(code: str, preferences: list[dict]) -> dict:
    """Review code snippet against recalled preferences."""
    pref_text = "\n".join(
        f"- [{p.get('category', 'general')}] {p.get('text', str(p))}"
        for p in preferences
    )

    prompt = f"""You are a personalized code reviewer. You have the following recalled preferences about this developer:

{pref_text}

Review the code below. For each problem you find, tie it explicitly to one of the recalled preferences above.

Code:
```
{code}
```

Return a JSON object with exactly these keys:
  - "issues": array of strings — each issue naming the violated preference
  - "suggestions": array of strings — concrete fixes matching the developer's style
  - "memory_used": array of strings — the preference texts you actually used in this review

Return ONLY the JSON object, no explanation."""

    raw = _chat(prompt, max_tokens=2048)
    return json.loads(_strip_fences(raw))
