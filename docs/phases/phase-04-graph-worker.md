# Phase 4: Graph Worker

## Objective

Move graph analysis out of the frontend and into a Python worker.

## Tasks

- Implement `POST /graph/analyze`.
- Build an igraph graph from request nodes and edges.
- Run Leiden community detection when available.
- Fall back to multilevel or single-community assignment.
- Generate normalized coordinates.
- Size nodes by seed status or weighted degree.
- Label communities from top tags.

## Exit Criteria

- API service can call the worker for layout and communities.
- Worker returns stable positions, sizes, community IDs, and labels.
