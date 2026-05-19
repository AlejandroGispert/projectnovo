# projectnovo — Agent instructions

AI Knowledge Assistant / RAG platform. Read **`.cursor/skills/projectnovo-rag/SKILL.md`** first for stack, scope, and conventions.

## Commands (after scaffold exists)

```bash
docker compose up --build
# Backend migrations run on container start (alembic upgrade head)
```

## Skills installed for this project

37 specialist skills are symlinked under [`.cursor/skills/`](.cursor/skills/). Cursor also loads personal skills from `~/.cursor/skills/`.

**Always use for this repo:** `projectnovo-rag`

**By phase:**

| Phase | Skills |
|-------|--------|
| Orchestration | `app-builder`, `rag-implementation`, `blueprint`, `acceptance-orchestrator` |
| Docker / env | `docker-expert`, `environment-setup-guide`, `varlock` |
| Backend API | `fastapi-pro`, `fastapi-templates`, `async-python-patterns` |
| Database | `database-migration`, `postgres-best-practices` |
| Auth | `auth-implementation-patterns`, `cc-skill-security-review`, `api-security-best-practices` |
| Vectors / ingest | `rag-engineer`, `embedding-strategies`, `vector-database-engineer`, `file-uploads`, `ai-engineer` |
| LangChain | `langchain-architecture`, `llm-app-patterns`, `prompt-engineering-patterns` |
| Frontend | `react-nextjs-development`, `nextjs-best-practices`, `cc-skill-frontend-patterns`, `shadcn`, `chat-widget` |
| Ship | `verification-before-completion`, `readme`, `codebase-audit-pre-push` |
| E2E (optional) | `e2e-testing-patterns`, `playwright-skill` |

## Rules

See [`.cursor/rules/rag-platform.mdc`](.cursor/rules/rag-platform.mdc).

## Plan

Implementation plan: `.cursor/plans/rag_knowledge_platform_bf6eb852.plan.md` (or latest RAG plan in `.cursor/plans/`).
