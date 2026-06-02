# Phase 6: Caching and Polish

## Objective

Reduce repeated work and make local operation reliable.

## Tasks

- Add Redis or database-backed graph cache behavior.
- Reuse fresh `GraphSnapshot` records.
- Add edge explanation route.
- Add basic smoke tests.
- Validate README commands from a clean checkout.

## Exit Criteria

- Repeated graph loads avoid unnecessary Last.fm and worker calls.
- Common failures produce useful UI/API errors.
- The MVP can be run locally from README instructions.
