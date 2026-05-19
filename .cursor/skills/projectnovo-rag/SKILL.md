---
name: projectnovo-rag
description: >-
  AI Knowledge Assistant / RAG platform for projectnovo. Use when building or
  modifying this repo: FastAPI, PostgreSQL, Qdrant, LangChain, OpenAI,
  Next.js, Docker Compose, JWT auth, document upload, embeddings, or chat.
---

# Projectnovo RAG Platform

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Backend | Python, FastAPI, SQLAlchemy (async), Alembic, asyncpg |
| Vector DB | Qdrant (`document_chunks`, cosine, dim 1536) |
| Relational DB | PostgreSQL (users, documents, conversations, messages) |
| AI | OpenAI `text-embedding-3-small`, `gpt-4o-mini` |
| Orchestration | LangChain LCEL (retriever → prompt → ChatOpenAI) |
| Frontend | Next.js App Router, TypeScript, Tailwind |
| Infra | Docker Compose: postgres, qdrant, backend, frontend |

## Repository layout

```
backend/app/          # FastAPI application
frontend/src/         # Next.js application
docker-compose.yml
.env.example
```

## Security rules

- Never commit `.env` or API keys.
- Every document and Qdrant query **must** filter by `user_id` from JWT.
- Upload limit: 25 MB; types: PDF, `.md`, `.txt` only (v1).

## Qdrant payload

`user_id`, `document_id`, `chunk_index`, `text`, `filename`

## API prefix

`/api/v1/` — auth, documents, chat, health

## v1 scope (do not expand without asking)

- Sync chat JSON response (no SSE streaming)
- `BackgroundTasks` for ingestion (no Celery/Redis)
- OpenAI only (no Azure)
- File storage on Docker volume `/data/uploads`

## Phase → skill mapping

| Phase | Invoke skills |
|-------|----------------|
| Scaffold / Docker | `docker-expert`, `app-builder`, `environment-setup-guide` |
| FastAPI + DB | `fastapi-pro`, `database-migration`, `postgres-best-practices`, `async-python-patterns` |
| Auth | `auth-implementation-patterns`, `cc-skill-security-review` |
| Ingestion | `rag-engineer`, `embedding-strategies`, `vector-database-engineer`, `file-uploads` |
| RAG chat | `langchain-architecture`, `llm-app-patterns`, `rag-implementation` |
| Frontend | `react-nextjs-development`, `cc-skill-frontend-patterns`, `shadcn` |
| Done gate | `verification-before-completion` |

## Smoke test (required before “done”)

1. `docker compose up --build` — all services healthy
2. Register → login → upload PDF → status `ready`
3. New conversation → question → answer cites uploaded content
4. Second user cannot list or retrieve first user’s documents
