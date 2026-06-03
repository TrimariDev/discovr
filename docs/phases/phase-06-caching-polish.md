# Phase 6: Caching and Polish

## Objective

Reduce repeated work and make local operation reliable.

## Tasks

- Improve in-memory graph cache behavior.
- Reuse fresh graph payloads during the API process lifetime.
- Add edge explanation route.
- Add basic smoke tests.
- Validate README commands from a clean checkout.

## Exit Criteria

- [x] Repeated graph loads avoid unnecessary Last.fm and worker calls.
- [x] Common failures produce useful UI/API errors.
- [x] The MVP can be run locally from README instructions.

## Implemented

- `GET /api/edges/explain` — similarity edge, shared tags, same Leiden community (uses in-memory graph + tag cache).
- Enriched graphs written back to the graph cache after `POST /api/graphs/enrich`.
- `pnpm smoke` — health, search, graph, and edge explain checks (`scripts/smoke.mjs`).
- README updated for ports 3000 / 4000 / 8000 and smoke workflow.
