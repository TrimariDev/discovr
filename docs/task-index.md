# Discovr Task Index

Tasks are ordered to keep the MVP shippable at every stage.

**Parked / backlog:** see [backlog.md](./backlog.md).

## Phase 1: Foundation and Scaffolding

- [x] Create monorepo folders for `apps/web`, `services/api`, `workers/graph`, and `infra`.
- [x] Add root workspace files.
- [x] Add `.env.example`.
- [x] Add README with local run path.
- [x] Install and lock dependencies.

## Phase 2: Vertical Slice

- [x] Implement Last.fm `artist.getSimilar` client.
- [x] Add artist search/bootstrap route.
- [x] Add graph route for one seed artist.
- [x] Create graph payload with nodes, edges, and deterministic fallback layout.
- [x] Render graph in React with Sigma.js.
- [x] Add node click details panel.

## Phase 3: Lightweight API Contracts

- [x] Keep artist search/bootstrap simple and database-free.
- [x] Add short-lived in-memory graph cache.
- [x] Add explicit shared API response types (`@discovr/contracts`: per-route responses, errors, type guards).

## Phase 4: Graph Worker

- [x] Add FastAPI worker skeleton.
- [x] Implement graph request/response models.
- [x] Implement igraph graph creation.
- [x] Implement Leiden with multilevel fallback.
- [x] Implement normalized layout.
- [x] Connect API graph route to worker (`GRAPH_WORKER_URL`, fallback to deterministic layout).

## Phase 5: Frontend Experience

- [x] Add initial Next.js app shell.
- [x] Add component placeholders for search, graph, panel, legend, and controls.
- [x] Add debounced artist search.
- [x] Add graph loading and error states.
- [x] Add community color mapping.
- [x] Add hover/click interactions.

## Phase 6: Caching and Polish

- [x] Add memory cache helper.
- [x] Reuse fresh graph snapshots in memory.
- [x] Add edge explanation route.
- [x] Add basic tests or smoke checks.
- [x] Verify local developer commands.
