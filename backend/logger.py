import logging
import sys
from datetime import datetime

# File + console handler so every HydraDB call is visibly logged
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("agent.log", mode="a"),
    ],
)

logger = logging.getLogger("copilot")


def log_hydra_write(tenant_id: str, sub_tenant_id: str, memories: list):
    logger.info(
        f"[HYDRADB WRITE] tenant={tenant_id} sub_tenant={sub_tenant_id} "
        f"count={len(memories)} items={[m['text'][:60] for m in memories]}"
    )


def log_hydra_query(tenant_id: str, sub_tenant_id: str, query: str, result_count: int):
    logger.info(
        f"[HYDRADB QUERY] tenant={tenant_id} sub_tenant={sub_tenant_id} "
        f"query='{query}' results={result_count}"
    )


def log_nebius_embed(model: str, text_preview: str, dim: int):
    logger.info(
        f"[NEBIUS EMBED] model={model} input='{text_preview[:60]}' embedding_dim={dim}"
    )


def log_nebius_llm_call(endpoint: str, prompt_preview: str):
    logger.info(
        f"[NEBIUS LLM] endpoint={endpoint} prompt='{prompt_preview[:80]}'"
    )
