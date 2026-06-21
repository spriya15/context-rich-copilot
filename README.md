# Context-Rich Copilot

> "Context over Amnesia" — a coding assistant that remembers your tech stack and coding preferences across sessions, then automatically applies them when reviewing new code.

## Demo Flow

1. **Session 1 (Teach)** — Describe your stack in plain English. The agent parses preferences and writes them to HydraDB.
2. **Session 2 (Review)** — Paste any code snippet. The agent queries HydraDB, recalls your preferences, and reviews the code against them.
3. **Context Isolation** — Separate memory namespaces per language (`typescript`, `python`) — no cross-contamination.

## Tech Stack

| Layer | Tool |
|-------|------|
| Memory | HydraDB (primary storage + retrieval) |
| LLM Reasoning | Nebius (`meta-llama/Llama-3.3-70B-Instruct`) |
| Embeddings | Nebius (`Qwen/Qwen3-Embedding-8B`) |
| Backend | FastAPI (Python) |
| Frontend | React + TypeScript (Lovable) |

## Project Structure

```
context-rich-copilot/
├── backend/
│   ├── main.py          # FastAPI app — /teach, /review, /memory endpoints
│   ├── memory.py        # HydraDB read/write layer
│   ├── llm.py           # Nebius LLM calls (parse + review)
│   ├── nebius_embed.py  # Nebius embedding calls
│   ├── logger.py        # Execution logger (proof of HydraDB calls)
│   └── requirements.txt
└── frontend/            # React UI (Lovable)
```

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Expose backend publicly (for Lovable frontend)
```bash
cloudflared tunnel --url http://localhost:8000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/teach` | POST | Parse preferences and write to HydraDB |
| `/review` | POST | Query HydraDB and review code against recalled preferences |
| `/memory` | GET | Return all stored preferences for a context |
| `/contexts` | GET | List all memory namespaces |
| `/health` | GET | Health check |

### Request Examples

```bash
# Teach
curl -X POST http://localhost:8000/teach \
  -H "Content-Type: application/json" \
  -d '{"text": "I use TypeScript with strict mode...", "context": "typescript"}'

# Review
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{"code": "var x = ...", "context": "typescript"}'
```

## Execution Logs

Every HydraDB write and query is logged to `agent.log`:
```
[HYDRADB WRITE] tenant=copilot sub_tenant=typescript count=9
[HYDRADB QUERY] tenant=copilot sub_tenant=typescript query='code style...' results=9
[NEBIUS EMBED]  model=Qwen/Qwen3-Embedding-8B embedding_dim=3584
[NEBIUS LLM]    model=meta-llama/Llama-3.3-70B-Instruct
```

## Hackathon Submission

- **Theme:** Context over Amnesia
- **Submission code:** MEMORY2026
