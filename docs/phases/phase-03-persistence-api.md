# Phase 3: Persistence and API Contracts

## Objective

Persist artists, tags, weighted edges, and graph snapshots behind explicit API contracts.

## Tasks

- Finalize Prisma models for `Artist`, `ArtistTag`, `ArtistEdge`, and `GraphSnapshot`.
- Add Prisma client setup.
- Implement artist search/bootstrap route.
- Implement graph route with snapshot lookup.
- Save graph snapshot payloads after generation.
- Keep API response types explicit and shared where practical.

## Exit Criteria

- Local Postgres stores artist and graph data.
- Repeated graph requests can reuse saved snapshots.
- API payloads match the documented contract.
