# Phase 4: Graph Worker

## Objective

Move graph analysis out of the frontend and into a Python worker.

## Tasks

- Implement `POST /graph/analyze`.
- Build an igraph graph from request nodes and edges.
- Run Leiden community detection when available.
- Fall back to multilevel or single-community assignment.
- Generate normalized coordinates.
- Size nodes by seed status or weighted degree.
- Label communities from top tags.

## Exit Criteria

- API service can call the worker for layout and communities.
- Worker returns stable positions, sizes, community IDs, and labels.

## Integration (done)

- `services/api/src/services/graphWorker.ts` posts to `POST {GRAPH_WORKER_URL}/graph/analyze`.
- `buildArtistGraph` uses worker output when available; `meta.algorithm` is `igraph-leiden-or-fallback` or `deterministic-fallback`.
- Graph cache key includes `:v2` so old fallback-only snapshots are not reused.
- Set `GRAPH_WORKER_URL=http://localhost:8001` in `.env` and run the worker before loading graphs.
