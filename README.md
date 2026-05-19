# AI Knowledge Assistant (RAG Platform)

Retrieval-Augmented Generation platform: upload PDFs and markdown, then chat with your documents using semantic search and Google Gemini.

## Screenshots

### Architecture

How data flows from the Next.js UI through FastAPI to Postgres, Qdrant, and Google Gemini:

![System architecture](docs/images/architecture.png)

### Chat demo

Ask questions about uploaded documents; answers are grounded in your files with source citations:

![Chat interface](docs/images/chat-demo.png)

### Qdrant vector store

Indexed document chunks live in Qdrant (`document_chunks_gemini_v2`, 3072-dim cosine vectors). Open the dashboard at http://localhost:6333/dashboard to inspect collections and payloads:

![Qdrant collections](docs/images/qdrant-collections.png)

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Vectors:** Qdrant + Gemini `gemini-embedding-001` (3072 dims)
- **AI:** LangChain LCEL + `gemini-2.5-flash-lite` (chat; free-tier friendly)
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Infra:** Docker Compose

## Prerequisites

- Docker Desktop with Compose v2 (app must be **running** — whale icon in menu bar)
- [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier available with rate limits)

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

1. Copy environment file and add your Google API key:

```bash
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=...
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
export GOOGLE_API_KEY=...
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

> Built a Retrieval-Augmented Generation platform with FastAPI, PostgreSQL, Qdrant, and LangChain. Implemented JWT auth, async document ingestion with Gemini embeddings, semantic retrieval, and conversational Q&A over user-uploaded PDFs and markdown — deployed via Docker Compose with a Next.js frontend.

## Troubleshooting (Docker)

**Backend container exits immediately (`python3`, exit 0)**  
You likely started the image with Docker Desktop **Run** instead of Compose. The image default is now `/docker-entrypoint.sh` (migrations + uvicorn). Always use:

```bash
docker compose up --build
```

**`exec format error` on Alpine images**  
Some Docker Desktop setups on Intel Macs cannot run `*-alpine` images. This project uses `postgres:16` and `node:20-bookworm-slim` instead of Alpine variants.

**Start only infra for local backend dev**

```bash
docker compose up -d postgres qdrant
```

**Switched from OpenAI to Gemini**  
Use `GOOGLE_API_KEY` in `.env`, restart the backend, and re-upload documents. The Qdrant collection is `document_chunks_gemini_v2` (3072-dimensional Gemini embeddings). If ingestion fails with a model error, set `EMBEDDING_MODEL=models/gemini-embedding-001` in `.env`.

**429 quota on chat**  
`gemini-2.0-flash` often has free-tier limit `0`. Set `CHAT_MODEL=gemini-2.5-flash-lite` in `.env` (or `gemini-flash-latest`) and restart the backend. Wait ~1 minute if you hit per-minute limits.

## Security notes

- Documents and vectors are scoped per `user_id`
- Do not commit `.env` or expose `JWT_SECRET` in production
- Change default secrets before any public deployment
