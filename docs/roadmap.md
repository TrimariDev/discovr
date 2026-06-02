# Discovr MVP Roadmap

This roadmap distills `discovr-codex-build-brief.md` into implementation phases for the v0.1 MVP.

## Product Goal

Build a local-first MVP for Discovr: a music discovery app where a user searches for an artist and receives an interactive graph of similar artists, communities, tags, and details.

## Architecture Principle

The frontend renders graph snapshots only. Graph construction, clustering, layout, persistence, and caching belong in backend services or the Python graph worker.

## Phases

1. **Foundation and Scaffolding**
   - Create the monorepo structure.
   - Add package/workspace configuration.
   - Add Docker Compose for Postgres and Redis.
   - Add environment examples and developer docs.

2. **Vertical Slice**
   - Search for an artist.
   - Fetch Last.fm similar artists.
   - Build a graph payload.
   - Render an interactive Sigma.js graph.
   - Use deterministic fallback layout until the worker is connected.

3. **Persistence and API Contracts**
   - Add Prisma schema for artists, tags, edges, and snapshots.
   - Implement search/bootstrap endpoints.
   - Implement graph snapshot endpoint.
   - Save artist nodes, weighted edges, and graph snapshots.

4. **Graph Worker**
   - Add FastAPI worker.
   - Analyze graph with python-igraph.
   - Use Leiden community detection when available.
   - Fall back to multilevel or single-community assignment.
   - Return layout coordinates, community IDs, node sizes, and community labels.

5. **Frontend Experience**
   - Add debounced search.
   - Render graph with community colors.
   - Add node click selection and artist details panel.
   - Add community legend and basic controls.
   - Add loading and error states.

6. **Caching and Polish**
   - Reuse fresh graph snapshots.
   - Add Redis or database-backed cache behavior.
   - Add edge explanation endpoint.
   - Harden errors and README run instructions.

## v0.1 Done Means

- A developer can set `LASTFM_API_KEY`.
- Postgres and Redis can start locally.
- The app can search for an artist such as Radiohead.
- At least 30 artist nodes render in an interactive graph.
- Nodes are positioned, sized, and colored by community.
- Clicking a node opens an artist details panel.
- A graph snapshot is saved or cached.
- UI errors do not crash the app.
