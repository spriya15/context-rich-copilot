import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback

from logger import logger
import memory
import llm
import nebius_embed

app = FastAPI(title="Context-Rich Copilot", version="1.0.0")

@app.on_event("startup")
async def startup():
    memory.ensure_tenant()
    logger.info("[startup] HydraDB tenant ready")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ──────────────────────────────────────────────────

class TeachRequest(BaseModel):
    text: str
    context: str = "default"  # e.g. "typescript", "python", "react"


class TeachResponse(BaseModel):
    status: str
    stored_count: int
    preferences: list[dict]
    context: str


class ReviewRequest(BaseModel):
    code: str
    context: str = "default"


class ReviewResponse(BaseModel):
    issues: list[str]
    suggestions: list[str]
    memory_used: list[str]
    context: str


# ── Fallback parser ──────────────────────────────────────────────────────────

def _rule_based_parse(text: str) -> list[dict]:
    import re
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 10]
    return [{"text": s[:120], "category": "other"} for s in sentences]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/teach", response_model=TeachResponse)
async def teach(req: TeachRequest):
    """
    Session 1 — parse preferences and write to HydraDB under an isolated context (sub_tenant).
    Each context (e.g. 'typescript', 'python') gets its own memory namespace.
    """
    try:
        sub_tenant = req.context.lower().strip() or "default"
        logger.info(f"[/teach] context={sub_tenant} text={len(req.text)} chars")

        # 1. Nebius: embed the raw text
        try:
            _vec = nebius_embed.embed_text(req.text)
            logger.info(f"[/teach] Nebius embedding dim={len(_vec)}")
        except Exception as e:
            logger.warning(f"[/teach] Nebius embed failed (non-fatal): {e}")

        # 2. Nebius LLM: parse preferences
        try:
            parsed = llm.parse_preferences(req.text)
            logger.info(f"[/teach] parsed {len(parsed)} preferences for context={sub_tenant}")
        except Exception as e:
            logger.warning(f"[/teach] LLM failed, using fallback: {e}")
            parsed = _rule_based_parse(req.text)

        # 3. HydraDB: write to isolated sub_tenant namespace
        memories = [
            {
                "text": p["text"],
                "infer": True,
                "metadata": {"category": p.get("category", "other"), "context": sub_tenant},
            }
            for p in parsed
        ]
        memory.write_preferences(memories, sub_tenant=sub_tenant)
        logger.info(f"[/teach] wrote {len(memories)} entries to HydraDB sub_tenant={sub_tenant}")

        return TeachResponse(
            status="ok",
            stored_count=len(memories),
            preferences=parsed,
            context=sub_tenant,
        )

    except Exception:
        logger.error(f"[/teach] error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.post("/review", response_model=ReviewResponse)
async def review(req: ReviewRequest):
    """
    Session 2 — query HydraDB using the same context namespace used during /teach.
    Only recalls preferences for that specific context — no cross-contamination.
    """
    try:
        sub_tenant = req.context.lower().strip() or "default"
        logger.info(f"[/review] context={sub_tenant} code={len(req.code)} chars")

        # 1. HydraDB: recall from the correct context namespace
        recalled = memory.query_preferences(
            query="code style language framework testing architecture preferences",
            sub_tenant=sub_tenant,
        )
        logger.info(f"[/review] recalled {len(recalled)} preferences from context={sub_tenant}")

        if not recalled:
            return ReviewResponse(
                issues=[f"No preferences stored for context '{sub_tenant}' — run /teach first."],
                suggestions=[],
                memory_used=[],
                context=sub_tenant,
            )

        # 2. Nebius LLM: review code against recalled preferences
        try:
            result = llm.review_code(req.code, recalled)
        except Exception as e:
            logger.warning(f"[/review] LLM failed: {e}")
            result = {
                "issues": ["Nebius LLM unavailable — check API key"],
                "suggestions": ["Add correct Nebius AI Studio key to .env"],
                "memory_used": [p.get("text", str(p)) for p in recalled[:3]],
            }

        return ReviewResponse(
            issues=result.get("issues", []),
            suggestions=result.get("suggestions", []),
            memory_used=result.get("memory_used", []),
            context=sub_tenant,
        )

    except Exception:
        logger.error(f"[/review] error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.get("/memory")
async def get_memory(context: str = "default"):
    """Returns stored preferences for a given context namespace."""
    try:
        sub_tenant = context.lower().strip() or "default"
        items = memory.list_all_preferences(sub_tenant=sub_tenant)
        return {"count": len(items), "context": sub_tenant, "preferences": items}
    except Exception:
        logger.error(f"[/memory] error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.get("/contexts")
async def list_contexts():
    """Returns all known context namespaces (sub_tenants)."""
    try:
        contexts = memory.list_sub_tenants()
        return {"contexts": contexts}
    except Exception:
        logger.error(f"[/contexts] error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.get("/health")
async def health():
    return {"status": "ok"}
