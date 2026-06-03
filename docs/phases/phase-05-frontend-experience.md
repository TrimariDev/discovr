# Phase 5: Frontend Experience

## Objective

Make the MVP feel like a useful music map rather than a raw graph dump.

## Tasks

- Add debounced search input and result list.
- Render graph full viewport on dark background.
- Color nodes deterministically by community.
- Highlight neighbors on hover.
- Open artist panel on node click.
- Add community legend and reset controls.
- Add loading and error states.

## Exit Criteria

- [x] The default flow is smooth from search to graph inspection.
- [x] The UI handles empty, loading, and error states without crashing.

## Implemented

- Debounced search (300ms) with “Searching…” status in the dropdown.
- Graph placeholders: idle, loading spinner, and error copy.
- `CommunityLegend` — cluster colors aligned with `communityPalette`.
- `GraphControls` — reset view, focus seed, clear tag filters.
- Hover highlights neighbors (dim non-neighbors); click opens panel and recenters on non-seed nodes.
