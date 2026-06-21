"""HydraDB memory layer — all reads/writes go through here."""
import os
from hydra_db import HydraDB
from logger import log_hydra_write, log_hydra_query

_client: HydraDB | None = None


def get_client() -> HydraDB:
    global _client
    if _client is None:
        _client = HydraDB(token=os.environ["HYDRADB_API_KEY"])
    return _client


TENANT = lambda: os.environ.get("HYDRADB_TENANT_ID", "copilot")
DEFAULT_SUB = lambda: os.environ.get("HYDRADB_SUB_TENANT_ID", "default")


def ensure_tenant():
    """Create tenant if it doesn't exist (idempotent)."""
    client = get_client()
    try:
        client.tenant.create(tenant_id=TENANT())
    except Exception:
        pass


def write_preferences(memories: list[dict], sub_tenant: str = None) -> dict:
    """Write parsed preference entries to HydraDB under a specific context namespace."""
    client = get_client()
    t = TENANT()
    st = sub_tenant or DEFAULT_SUB()
    log_hydra_write(t, st, memories)
    result = client.upload.add_memory(
        tenant_id=t,
        sub_tenant_id=st,
        upsert=True,
        memories=memories,
    )
    return result


def query_preferences(query: str, sub_tenant: str = None, max_results: int = 10) -> list[dict]:
    """Recall preferences from a specific context namespace."""
    client = get_client()
    t = TENANT()
    st = sub_tenant or DEFAULT_SUB()
    result = client.recall.recall_preferences(
        query=query,
        tenant_id=t,
        sub_tenant_id=st,
        alpha=0.8,
        recency_bias=0,
    )
    items = _extract_chunks(result)
    log_hydra_query(t, st, query, len(items))
    return items[:max_results]


def list_all_preferences(sub_tenant: str = None) -> list[dict]:
    """Return all stored preferences for a context namespace."""
    client = get_client()
    t = TENANT()
    st = sub_tenant or DEFAULT_SUB()
    result = client.recall.recall_preferences(
        query="developer preferences stack style language framework",
        tenant_id=t,
        sub_tenant_id=st,
        alpha=0.5,
        recency_bias=0,
    )
    items = _extract_chunks(result)
    log_hydra_query(t, st, "list_all", len(items))
    return items


def list_sub_tenants() -> list[str]:
    """Return all known context namespaces."""
    client = get_client()
    try:
        result = client.tenant.get_sub_tenant_ids(tenant_id=TENANT())
        return result if isinstance(result, list) else getattr(result, "sub_tenant_ids", [])
    except Exception:
        return []


def _extract_chunks(result) -> list[dict]:
    """Normalize HydraDB RetrievalResult into plain dicts."""
    if isinstance(result, list):
        return result
    chunks = getattr(result, "chunks", [])
    return [
        {
            "text": c.chunk_content.split("\n\n")[0],
            "category": (c.metadata or {}).get("category", "other"),
            "score": round(c.relevancy_score, 3),
        }
        for c in chunks
    ]
