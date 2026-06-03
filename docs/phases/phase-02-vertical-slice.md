# Phase 2: Vertical Slice

## Objective

Prove the core product loop: search an artist, fetch similar artists, generate a graph payload, and render it.

## Tasks

- [x] Implement Last.fm similar artist client with graceful errors.
- [x] Search/bootstrap local artist data.
- [x] Build a depth-1 graph for one seed artist.
- [x] Generate fallback layout and provisional communities before worker integration.
- [x] Render nodes and edges in Sigma.js.
- [x] Show artist details on node click.

## Exit Criteria

- Searching `Radiohead` returns graph data.
- At least 30 nodes can render.
- The graph is interactive enough to click nodes and inspect details.
