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

- Repeated graph loads avoid unnecessary Last.fm and worker calls.
- Common failures produce useful UI/API errors.
- The MVP can be run locally from README instructions.
