# Phase 2: Vertical Slice

## Objective

Prove the core product loop: search an artist, fetch similar artists, generate a graph payload, and render it.

## Tasks

- Implement Last.fm similar artist client with graceful errors.
- Search/bootstrap local artist data.
- Build a depth-1 graph for one seed artist.
- Generate fallback layout and provisional communities before worker integration.
- Render nodes and edges in Sigma.js.
- Show artist details on node click.

## Exit Criteria

- Searching `Radiohead` returns graph data.
- At least 30 nodes can render.
- The graph is interactive enough to click nodes and inspect details.
