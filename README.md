# Discovr

Discovr is a Music-Map-style discovery MVP. Search for an artist, fetch similar artists from Last.fm, and explore the results as an interactive graph.

## Architecture

- `apps/web`: Next.js + React + TypeScript frontend.
- `services/api`: TypeScript API service, Last.fm integration, persistence, and graph orchestration.
- `workers/graph`: FastAPI + python-igraph worker for communities and layout.
- `infra`: local Postgres, Redis, and environment examples.

The frontend renders snapshots only. Heavy graph construction, clustering, layout, and caching belong in the API or graph worker.

## Local Setup

```bash
pnpm install
cp infra/.env.example .env
docker compose -f infra/docker-compose.yml up -d
pnpm --filter api prisma migrate dev
pnpm dev:api
pnpm dev:web
```

In another shell, start the graph worker:

```bash
cd workers/graph
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) and [docs/task-index.md](docs/task-index.md).

