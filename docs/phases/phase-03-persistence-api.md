# Phase 3: Lightweight API Contracts

## Objective

Keep the first MVP database-free while preserving explicit API contracts.

## Tasks

- Implement artist search/bootstrap route.
- Implement graph route with in-memory snapshot lookup.
- Cache generated graph payloads briefly.
- Keep API response types explicit and shared where practical.

## Exit Criteria

- No local database is required.
- Repeated graph requests can reuse cached snapshots during the API process lifetime.
- API payloads match the documented contract.

## Shared types (`packages/contracts`)

| Route | Response type |
|-------|----------------|
| `GET /health` | `HealthCheckResponse` |
| `GET /api/artists/search` | `ArtistSearchResponse` |
| `GET /api/artists/info` | `ArtistInfoResponse` |
| `GET /api/graphs/artist/:artistId` | `GetArtistGraphResponse` |
| `POST /api/graphs/tags` | `PostGraphTagsResponse` |
| 4xx/5xx JSON errors | `ApiErrorResponse` |

Domain models (`GraphNode`, `GraphSnapshot`, `ArtistSearchResult`, …) live alongside these in the same package. The web client validates responses with `isArtistSearchResponse`, `isGraphSnapshot`, etc.
