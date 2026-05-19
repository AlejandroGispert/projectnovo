---
name: RAG Knowledge Platform
overview: "Greenfield monorepo: FastAPI backend with JWT auth, PostgreSQL metadata, Qdrant vectors, LangChain RAG pipeline (OpenAI embeddings + chat), and Next.js frontend — all orchestrated via Docker Compose."
todos:
  - id: skills-setup
    content: Install/link Cursor skills, projectnovo-rag skill, AGENTS.md, rag-platform rule
    status: completed
  - id: scaffold-infra
    content: Create monorepo layout, docker-compose.yml, Dockerfiles, .env.example, README
    status: pending
  - id: backend-core
    content: "FastAPI app: async SQLAlchemy, Alembic migrations, User/Document/Conversation/Message models"
    status: pending
  - id: auth-jwt
    content: JWT register/login/me endpoints + password hashing + get_current_user dependency
    status: pending
  - id: qdrant-ingest
    content: Qdrant client, collection bootstrap, upload + BackgroundTasks ingestion pipeline (PDF/MD/TXT)
    status: pending
  - id: rag-chat
    content: LangChain retriever + LCEL chain, conversation/message APIs with source metadata
    status: pending
  - id: frontend-ui
    content: "Next.js: login/register, dashboard upload, chat UI with conversation history"
    status: pending
  - id: polish-docs
    content: Error handling, .gitignore, README with setup + CV description, end-to-end smoke test
    status: pending
isProject: false
---

# AI Knowledge Assistant / RAG Platform

## Context

Workspace [`/Users/alejandrolivemusicmac/Documents/projectnovo`](/Users/alejandrolivemusicmac/Documents/projectnovo) is **empty** — full greenfield build.

**Locked choices (from you):**
- **LLM:** OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`)
- **Orchestration:** LangChain (LCEL retrieval chain)

---

## Phase 0 — Cursor skills (completed)

**Global skills:** All 37 recommended skills were already installed under `~/.cursor/skills/`.

**Project bindings** (in repo):

| Artifact | Purpose |
|----------|---------|
| [`.cursor/skills/`](projectnovo/.cursor/skills/) | 37 symlinks to global skills + custom `projectnovo-rag` |
| [`.cursor/skills/projectnovo-rag/SKILL.md`](projectnovo/.cursor/skills/projectnovo-rag/SKILL.md) | Project-specific stack, scope, phase→skill map |
| [`AGENTS.md`](projectnovo/AGENTS.md) | Agent entrypoint and skill roster |
| [`.cursor/rules/rag-platform.mdc`](projectnovo/.cursor/rules/rag-platform.mdc) | Always-on conventions |

**During implementation:** Read `projectnovo-rag` first; invoke phase skills from `AGENTS.md`.

---

## Target architecture

```mermaid
flowchart TB
  subgraph frontend [Next.js Frontend]
    Login[Login / Register]
    Upload[Document Upload]
    Chat[Chat UI + History]
  end

  subgraph backend [FastAPI Backend]
    Auth[JWT Auth]
  API[REST API]
    Ingest[Ingestion Service]
    RAG[LangChain RAG Chain]
  end

  subgraph data [Data Layer]
    PG[(PostgreSQL)]
    QD[(Qdrant)]
  end

  subgraph external [External]
    OAI[OpenAI API]
  end

  Login --> Auth
  Upload --> API --> Ingest
  Chat --> API --> RAG
  Auth --> PG
  Ingest --> PG
  Ingest --> QD
  Ingest --> OAI
  RAG --> QD
  RAG --> PG
  RAG --> OAI
```

**Separation of concerns**
- **PostgreSQL:** users, document metadata, conversation/message history, ingestion job status
- **Qdrant:** chunk vectors + payload (`document_id`, `user_id`, `chunk_index`, `text`)
- **LangChain:** chunking, embedding, retriever, prompt + LLM call

---

## Repository layout

```
projectnovo/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml          # uv or poetry; FastAPI, sqlalchemy, alembic, langchain-*
│   ├── alembic/
│   └── app/
│       ├── main.py
│       ├── core/               # config, security (JWT), deps
│       ├── db/                 # session, base
│       ├── models/             # User, Document, Conversation, Message
│       ├── schemas/            # Pydantic v2
│       ├── api/v1/             # routers: auth, documents, chat, health
│       ├── services/           # ingestion, qdrant, rag
│       └── workers/            # optional: BackgroundTasks first, Celery later if needed
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/                # App Router: login, dashboard, chat/[id]
        ├── components/
        └── lib/                # api client, auth token storage
```

---

## PostgreSQL schema (SQLAlchemy + Alembic)

| Table | Purpose | Key fields |
|-------|---------|------------|
| `users` | Auth | `id`, `email` (unique), `hashed_password`, `created_at` |
| `documents` | Uploaded files | `id`, `user_id`, `filename`, `content_type`, `status` (`pending`/`processing`/`ready`/`failed`), `chunk_count`, `error_message`, `created_at` |
| `conversations` | Chat threads | `id`, `user_id`, `title`, `created_at`, `updated_at` |
| `messages` | Turn history | `id`, `conversation_id`, `role` (`user`/`assistant`), `content`, `sources` (JSONB — retrieved chunk refs), `created_at` |

**Note:** Raw file bytes live on disk in a Docker volume (`/data/uploads`); DB stores paths + metadata only. Qdrant holds vectors; no duplicate embedding rows in Postgres (keeps schema minimal for CV scope).

**Alembic:** initial migration `001_initial_schema`; seed not required.

---

## Qdrant design

- **Collection:** `document_chunks` (created on startup if missing)
- **Vector size:** 1536 (`text-embedding-3-small`)
- **Distance:** Cosine
- **Point ID:** deterministic UUID from `(document_id, chunk_index)` or Qdrant auto-id with payload
- **Payload:** `user_id`, `document_id`, `chunk_index`, `text`, `filename`
- **Filter on search:** `user_id` must match JWT subject (multi-tenant isolation)

Optional scope filter: `document_ids[]` query param on chat to restrict retrieval to selected docs.

---

## Backend API surface

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/api/v1/auth/register` | No | Create user, return JWT |
| POST | `/api/v1/auth/login` | No | OAuth2 password form → JWT |
| GET | `/api/v1/auth/me` | Yes | Current user |
| POST | `/api/v1/documents/upload` | Yes | Multipart PDF/MD/TXT; enqueue processing |
| GET | `/api/v1/documents` | Yes | List user documents + status |
| GET | `/api/v1/documents/{id}` | Yes | Detail |
| DELETE | `/api/v1/documents/{id}` | Yes | Delete PG row, Qdrant points, file |
| POST | `/api/v1/chat/conversations` | Yes | New conversation |
| GET | `/api/v1/chat/conversations` | Yes | List with last message preview |
| GET | `/api/v1/chat/conversations/{id}/messages` | Yes | History |
| POST | `/api/v1/chat/conversations/{id}/messages` | Yes | User message → RAG → assistant reply (sync JSON first; SSE optional stretch) |
| GET | `/health` | No | Liveness |

**JWT:** `python-jose` + `passlib[bcrypt]`; access token ~24h; `Authorization: Bearer`.

**Ingestion pipeline** (async via `BackgroundTasks` — sufficient for CV demo):

1. Save file to volume; insert `documents` row (`processing`)
2. Load text: `pypdf` for PDF, raw read for `.md`/`.txt`
3. LangChain `RecursiveCharacterTextSplitter` (e.g. chunk 1000, overlap 200)
4. `OpenAIEmbeddings(model="text-embedding-3-small")` — batch embed
5. Upsert points to Qdrant with payload
6. Update document `status=ready`, `chunk_count`

On failure: `status=failed`, `error_message` set.

**RAG chain** (LangChain LCEL):

```python
# Conceptual flow in app/services/rag.py
retriever = QdrantVectorStore(...).as_retriever(
    search_kwargs={"k": 5, "filter": user_filter}
)
chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o-mini", temperature=0)
    | StrOutputParser()
)
```

- System prompt: answer only from context; cite sources; say if unknown
- Persist user + assistant `messages`; store `sources` JSON from retrieved payloads
- Auto-title conversation from first user message (truncated) if `title` empty

---

## Frontend (Next.js 14+ App Router)

| Route | UI |
|-------|-----|
| `/login`, `/register` | Forms → store JWT in `httpOnly` cookie **or** `localStorage` + `Authorization` header (prefer cookie via Next route handler proxy for slightly better security; localStorage acceptable for portfolio speed) |
| `/` | Redirect to `/dashboard` |
| `/dashboard` | Document list, upload dropzone, status badges |
| `/chat` | Conversation sidebar + new chat |
| `/chat/[conversationId]` | Message thread, input, streaming-ready layout (initially waits for full JSON response) |

**Shared `lib/api.ts`:** typed fetch wrapper with 401 → redirect login.

**Styling:** Tailwind + minimal shadcn-style components (Button, Input, Card) — no heavy design system required.

---

## Docker Compose

Services:

| Service | Image / build | Ports | Notes |
|---------|---------------|-------|-------|
| `postgres` | `postgres:16-alpine` | 5432 | volume `pg_data` |
| `qdrant` | `qdrant/qdrant:latest` | 6333, 6334 | volume `qdrant_data` |
| `backend` | build `./backend` | 8000 | depends on postgres, qdrant; env from `.env` |
| `frontend` | build `./frontend` | 3000 | `NEXT_PUBLIC_API_URL=http://localhost:8000` |

**Volumes:** `uploads_data` mounted at `/data/uploads` on backend.

**Startup:** backend runs Alembic upgrade on container start (`command: sh -c "alembic upgrade head && uvicorn ..."`).

---

## Configuration (`.env.example`)

```env
# OpenAI
OPENAI_API_KEY=

# Postgres
DATABASE_URL=postgresql+asyncpg://rag:rag@postgres:5432/rag

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=document_chunks

# JWT
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# App
UPLOAD_DIR=/data/uploads
MAX_UPLOAD_MB=25
CORS_ORIGINS=http://localhost:3000
```

---

## Key dependencies

**Backend:** `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pydantic-settings`, `python-jose`, `passlib`, `python-multipart`, `qdrant-client`, `langchain`, `langchain-openai`, `langchain-community`, `pypdf`, `aiofiles`

**Frontend:** `next`, `react`, `typescript`, `tailwindcss`, optional `zod` for form validation

---

## Implementation phases

### Phase 0 — Cursor skills (done)

See section above. No code changes.

### Phase 1 — Scaffold and infrastructure
- Monorepo folders, `docker-compose.yml`, Dockerfiles, `.env.example`, README with `docker compose up` instructions
- Backend: FastAPI app shell, async SQLAlchemy engine, Alembic init + first migration
- Health check + CORS

### Phase 2 — Auth
- User model, register/login, JWT dependency `get_current_user`
- Frontend login/register pages + API client

### Phase 3 — Document ingestion
- Upload endpoint, file storage, background ingestion task
- Qdrant client wrapper + collection bootstrap on startup
- Document list/detail/delete APIs
- Dashboard upload UI with status polling (simple `refetch` every 3s while `processing`)

### Phase 4 — Chat / RAG
- Conversation + message models and APIs
- LangChain retriever + chain; chat endpoint persists history + sources
- Chat UI with sidebar history

### Phase 5 — Polish for portfolio
- README: architecture diagram, env setup, API summary, CV bullet–ready description
- Basic error handling (OpenAI rate limits, invalid file types)
- `.gitignore` (exclude `.env`, `uploads/`, `__pycache__`)

**Explicitly out of scope (v1):** SSE streaming, Celery/Redis, Azure OpenAI, admin panel, sharing docs across users, OCR for scanned PDFs.

---

## CV-ready one-liner (for README)

> Built a Retrieval-Augmented Generation platform with FastAPI, PostgreSQL, Qdrant, and LangChain. Implemented JWT auth, async document ingestion with OpenAI embeddings, semantic retrieval, and conversational Q&A over user-uploaded PDFs and markdown — deployed via Docker Compose with a Next.js frontend.

---

## Verification checklist (before calling done)

- `docker compose up --build` brings all four services healthy
- Register → login → upload PDF → status becomes `ready`
- Create conversation → ask question → answer references uploaded content
- Second user cannot see first user's documents (Qdrant filter + PG `user_id` checks)
- `alembic upgrade head` runs cleanly on fresh DB
