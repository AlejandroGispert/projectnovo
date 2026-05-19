# AI Knowledge Assistant (RAG Platform)

Retrieval-Augmented Generation platform: upload PDFs and markdown, then chat with your documents using semantic search and OpenAI.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Vectors:** Qdrant + OpenAI `text-embedding-3-small`
- **AI:** LangChain LCEL + `gpt-4o-mini`
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Infra:** Docker Compose

## Prerequisites

- Docker Desktop with Compose v2 (app must be **running** — whale icon in menu bar)
- OpenAI API key with billing enabled

### `docker: command not found` (macOS)

Docker Desktop installs the CLI outside the default PATH. Either:

```bash
# One-time: add to ~/.zshrc, then restart the terminal
echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.zshrc
```

Or use the project helper:

```bash
./scripts/compose.sh up --build
```

## Quick start

1. Copy environment file and add your OpenAI key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

2. Start all services:

```bash
docker compose up --build
```

3. Open the app:

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Usage flow

1. **Register** or **sign in**
2. **Upload** PDF, `.md`, or `.txt` on the Documents page
3. Wait until status is **ready** (embedding pipeline runs in background)
4. Open **Chat**, start a conversation, and ask questions about your uploads

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login (form: username=email, password) |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/documents/upload` | Upload file |
| GET | `/api/v1/documents` | List documents |
| POST | `/api/v1/chat/conversations` | New chat |
| POST | `/api/v1/chat/conversations/{id}/messages` | Ask a question (RAG) |

## Local development (without Docker)

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Start Postgres + Qdrant via docker compose up postgres qdrant
export DATABASE_URL=postgresql+asyncpg://rag:rag@localhost:5432/rag
export QDRANT_URL=http://localhost:6333
export OPENAI_API_KEY=sk-...
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## CV summary

> Built a Retrieval-Augmented Generation platform with FastAPI, PostgreSQL, Qdrant, and LangChain. Implemented JWT auth, async document ingestion with OpenAI embeddings, semantic retrieval, and conversational Q&A over user-uploaded PDFs and markdown — deployed via Docker Compose with a Next.js frontend.

## Security notes

- Documents and vectors are scoped per `user_id`
- Do not commit `.env` or expose `JWT_SECRET` in production
- Change default secrets before any public deployment
