# Discovr Task Index

Tasks are ordered to keep the MVP shippable at every stage.

## Phase 1: Foundation and Scaffolding

- [x] Create monorepo folders for `apps/web`, `services/api`, `workers/graph`, and `infra`.
- [x] Add root workspace files.
- [x] Add `.env.example`.
- [x] Add README with local run path.
- [ ] Install and lock dependencies.

## Phase 2: Vertical Slice

- [ ] Implement Last.fm `artist.getSimilar` client.
- [ ] Add artist search/bootstrap route.
- [ ] Add graph route for one seed artist.
- [ ] Create graph payload with nodes, edges, and deterministic fallback layout.
- [ ] Render graph in React with Sigma.js.
- [ ] Add node click details panel.

## Phase 3: Lightweight API Contracts

- [x] Keep artist search/bootstrap simple and database-free.
- [x] Add short-lived in-memory graph cache.
- [ ] Add explicit shared API response types.

## Phase 4: Graph Worker

- [x] Add FastAPI worker skeleton.
- [ ] Implement graph request/response models.
- [ ] Implement igraph graph creation.
- [ ] Implement Leiden with multilevel fallback.
- [ ] Implement normalized layout.
- [ ] Connect API graph route to worker.

## Phase 5: Frontend Experience

- [x] Add initial Next.js app shell.
- [x] Add component placeholders for search, graph, panel, legend, and controls.
- [ ] Add debounced artist search.
- [ ] Add graph loading and error states.
- [ ] Add community color mapping.
- [ ] Add hover/click interactions.

## Phase 6: Caching and Polish

- [x] Add memory cache helper.
- [x] Reuse fresh graph snapshots in memory.
- [ ] Add edge explanation route.
- [ ] Add basic tests or smoke checks.
- [ ] Verify local developer commands.
