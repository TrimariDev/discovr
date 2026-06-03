# Discovr

Discovr is a Music-Map-style discovery MVP. Search for an artist, fetch similar artists from Last.fm, and explore the results as an interactive graph.

## Architecture

- `apps/web`: Next.js + React + TypeScript frontend.
- `services/api`: TypeScript API service, Last.fm integration, in-memory graph cache, and graph orchestration.
- `workers/graph`: FastAPI + python-igraph worker for communities and layout.
- `infra`: environment examples.

The frontend renders snapshots only. Heavy graph construction, clustering, layout, and caching belong in the API or graph worker.

## Local Setup

### 1. Install dependencies

```bash
pnpm install
cp infra/.env.example .env
```

Add your `LASTFM_API_KEY` to `.env`.

### 2. Start services (three terminals)

**API** (port 4000):

```bash
GRAPH_WORKER_URL=http://localhost:8000 PORT=4000 pnpm dev:api
```

**Graph worker** (port 8000):

```bash
cd workers/graph
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

**Web** (port 3000):

```bash
pnpm --filter web exec next dev -p 3000
```

Open http://localhost:3000

Ensure `.env` contains:

```env
GRAPH_WORKER_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Smoke checks

With API and graph worker running (and `LASTFM_API_KEY` in `.env`):

```bash
pnpm smoke
```

## API highlights

| Endpoint | Description |
|----------|-------------|
| `GET /api/artists/search?q=` | Artist search |
| `GET /api/graphs/artist/:id` | Fast graph (similar artists + layout) |
| `POST /api/graphs/enrich` | Async tags, tag edges, Leiden communities |
| `GET /api/edges/explain?source=&target=&seed=` | Why two artists are connected |

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) and [docs/task-index.md](docs/task-index.md).
