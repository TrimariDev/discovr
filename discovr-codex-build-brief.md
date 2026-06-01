# Codex Build Brief — Discovr Music Graph MVP

## Projectdoel

Bouw een MVP voor een Music-Map-achtige discovery-app genaamd `discovr`, waarin een gebruiker een artiest zoekt en een interactieve graph-map krijgt met vergelijkbare artiesten, clusters, tags en klikbare details.

De app gebruikt een hybride architectuur:

- Frontend: Next.js + React + TypeScript
- Graph UI: Sigma.js + graphology
- Backend API: Next.js API routes of aparte Node/Express service binnen dezelfde monorepo
- Graph worker: Python + python-igraph
- Database: Postgres
- Cache/job state: Redis
- Eerste externe databron: Last.fm API
- Later uitbreidbaar met MusicBrainz, Spotify/Apple Music links, embeddings en personalisatie

## Belangrijke architectuurregel

De frontend mag geen zware graphanalyse doen. De frontend rendert alleen graph snapshots: nodes, edges, communities en x/y-posities. Graphconstructie, clustering, layout en caching gebeuren backend-side of in de Python worker.

---

## MVP Scope

Implementeer versie 0.1 met deze functies:

1. Artiest zoeken via tekstinput.
2. Similar artists ophalen via Last.fm `artist.getSimilar`.
3. Artist nodes en weighted edges opslaan in Postgres.
4. Graph snapshot genereren voor één seed artist.
5. Community detection uitvoeren met Python `igraph`, bij voorkeur Leiden als beschikbaar.
6. Fallback gebruiken wanneer Leiden niet beschikbaar is: multilevel/Louvain of connected components.
7. Layoutcoördinaten genereren.
8. Graph renderen in React met Sigma.js.
9. Node-click toont artist details in zijpaneel.
10. Edge-click of hover toont eenvoudige similarity explanation.
11. Graph-resultaten cachen via Redis of database snapshot.

---

## Repositorystructuur

Maak deze monorepo-structuur:

```txt
discovr/
  apps/
    web/
      package.json
      next.config.js
      tsconfig.json
      src/
        app/
          page.tsx
          layout.tsx
          globals.css
        components/
          SearchBar.tsx
          GraphCanvas.tsx
          ArtistPanel.tsx
          CommunityLegend.tsx
          GraphControls.tsx
        lib/
          api.ts
          graph.ts
          types.ts
        styles/
  services/
    api/
      package.json
      tsconfig.json
      src/
        index.ts
        routes/
          artists.ts
          graphs.ts
        services/
          lastfm.ts
          graphJobs.ts
          cache.ts
        db/
          prisma.ts
          schema.prisma
        types/
          graph.ts
  workers/
    graph/
      pyproject.toml
      requirements.txt
      src/
        main.py
        build_graph.py
        community.py
        layout.py
        models.py
  infra/
    docker-compose.yml
    .env.example
  README.md
```

Als eenvoudiger alternatief mag Codex een enkele Next.js-app maken met API routes onder `apps/web/src/app/api`, maar behoud wel de scheiding tussen frontend, API-services en worker.

---

## Environment variables

Maak `.env.example`:

```env
LASTFM_API_KEY=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discovr
REDIS_URL=redis://localhost:6379
GRAPH_WORKER_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=Discovr
```

---

## Database schema

Gebruik Prisma voor Postgres.

Maak minimaal deze modellen:

```prisma
model Artist {
  id             String   @id @default(uuid())
  mbid           String?  @unique
  name           String
  normalizedName String   @unique
  imageUrl       String?
  listeners      Int?
  playcount      Int?
  tags           ArtistTag[]
  outgoingEdges  ArtistEdge[] @relation("OutgoingEdges")
  incomingEdges  ArtistEdge[] @relation("IncomingEdges")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ArtistTag {
  id        String @id @default(uuid())
  artistId  String
  tag       String
  weight    Float  @default(1)
  source    String @default("lastfm")
  artist    Artist @relation(fields: [artistId], references: [id])

  @@unique([artistId, tag])
}

model ArtistEdge {
  id                  String @id @default(uuid())
  sourceArtistId       String
  targetArtistId       String
  weight              Float
  lastfmSimilarity    Float?
  tagSimilarity       Float?
  source              String @default("lastfm")
  sourceArtist        Artist @relation("OutgoingEdges", fields: [sourceArtistId], references: [id])
  targetArtist        Artist @relation("IncomingEdges", fields: [targetArtistId], references: [id])
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([sourceArtistId, targetArtistId])
}

model GraphSnapshot {
  id           String   @id @default(uuid())
  seedArtistId String
  depth        Int
  limit        Int
  algorithm    String
  status       String
  nodeCount    Int
  edgeCount    Int
  payload      Json
  generatedAt  DateTime @default(now())
}
```

---

## API Endpoints

### 1. Search artists

```http
GET /api/artists/search?q=radiohead
```

Behavior:

- Normalize query.
- Search local DB first.
- If not found, call Last.fm artist search or directly bootstrap from `artist.getSimilar`.
- Return compact results.

Response:

```json
{
  "results": [
    {
      "id": "artist_uuid",
      "name": "Radiohead",
      "mbid": "...",
      "imageUrl": "...",
      "tags": ["alternative rock", "art rock"]
    }
  ]
}
```

### 2. Get graph for artist

```http
GET /api/graphs/artist/:artistId?depth=1&limit=100
```

Behavior:

- Check existing `GraphSnapshot`.
- If fresh snapshot exists, return it.
- If not, build a new graph synchronously for MVP.
- Later this can become async with jobs.

Response:

```json
{
  "status": "ready",
  "graphId": "snapshot_uuid",
  "nodes": [
    {
      "id": "artist_uuid",
      "label": "Radiohead",
      "name": "Radiohead",
      "x": 0.1,
      "y": -0.2,
      "size": 18,
      "community": 1,
      "tags": ["alternative rock", "art rock"],
      "imageUrl": null
    }
  ],
  "edges": [
    {
      "id": "edge_uuid",
      "source": "artist_uuid_1",
      "target": "artist_uuid_2",
      "weight": 0.84,
      "label": "0.84"
    }
  ],
  "communities": [
    {
      "id": 1,
      "label": "Alternative / Art Rock",
      "topTags": ["alternative rock", "art rock", "experimental"]
    }
  ],
  "meta": {
    "seedArtistId": "artist_uuid",
    "depth": 1,
    "limit": 100,
    "algorithm": "igraph-leiden-or-fallback"
  }
}
```

### 3. Explain edge

```http
GET /api/edges/explain?source=:sourceArtistId&target=:targetArtistId
```

Response:

```json
{
  "score": 0.84,
  "reasons": [
    "High Last.fm similarity",
    "Shared tags: alternative rock, art rock",
    "Same detected community"
  ]
}
```

---

## Last.fm service

Create `lastfm.ts`.

Implement:

```ts
type LastFmSimilarArtist = {
  name: string;
  mbid?: string;
  match?: string;
  url?: string;
  image?: Array<{ "#text": string; size: string }>;
};

async function getSimilarArtists(input: {
  artistName?: string;
  mbid?: string;
  limit?: number;
}): Promise<LastFmSimilarArtist[]>;
```

Requirements:

- Use `artist.getSimilar`.
- Use `autocorrect=1`.
- Respect `limit`.
- Convert `match` to numeric similarity.
- Handle missing MBIDs.
- Handle API errors gracefully.
- Add simple rate-limit protection or retry with backoff.

---

## Graph-building algorithm

For MVP, implement depth 1 first.

Input:

```ts
{
  seedArtistId: string;
  depth: 1;
  limit: 100;
}
```

Algorithm:

1. Load seed artist.
2. Call Last.fm `artist.getSimilar` for seed artist.
3. Upsert similar artists.
4. Create directed or undirected edges from seed to similar artists.
5. Weight edge with Last.fm `match`.
6. For a better graph, optionally fetch similar artists for the top 20 neighbors and add those secondary edges.
7. Prune:
   - remove edges below `weight < 0.05`
   - keep max top 10 edges per artist
8. Send nodes and edges to Python graph worker.
9. Worker returns:
   - community per node
   - x/y layout
   - community labels if possible
10. Save `GraphSnapshot.payload`.

---

## Python graph worker

Use FastAPI for the worker.

Expose:

```http
POST /graph/analyze
```

Request:

```json
{
  "nodes": [
    {
      "id": "artist_uuid",
      "name": "Radiohead",
      "tags": ["alternative rock"]
    }
  ],
  "edges": [
    {
      "source": "artist_uuid_1",
      "target": "artist_uuid_2",
      "weight": 0.84
    }
  ]
}
```

Response:

```json
{
  "nodes": [
    {
      "id": "artist_uuid",
      "community": 1,
      "x": 0.1,
      "y": -0.2,
      "size": 18
    }
  ],
  "communities": [
    {
      "id": 1,
      "label": "Alternative / Art Rock",
      "topTags": ["alternative rock", "art rock"]
    }
  ]
}
```

Implementation details:

- Use `igraph.Graph`.
- Add vertices by artist ID.
- Add weighted edges.
- Try `community_leiden(weights="weight")`.
- If Leiden fails, try `community_multilevel(weights="weight")`.
- If that fails, assign all nodes to community 0.
- Layout:
  - Use `layout_fruchterman_reingold(weights="weight")` or another available igraph layout.
  - Normalize x/y coordinates to roughly `[-1, 1]`.
- Node size:
  - Seed artist larger.
  - Otherwise size based on weighted degree.

Community label algorithm:

1. For each community, collect all node tags.
2. Count tag frequency.
3. Pick top 2–3 tags.
4. Label as `"tag1 / tag2 / tag3"`.
5. If no tags, label `"Cluster {id}"`.

---

## Frontend implementation

### `SearchBar.tsx`

Requirements:

- Text input.
- Debounced search.
- Shows artist results.
- On select, calls `loadGraph(artistId)`.

### `GraphCanvas.tsx`

Use:

- `sigma`
- `graphology`
- preferably `@react-sigma/core` if compatible

Requirements:

- Convert API `nodes` and `edges` to graphology graph.
- Render with Sigma.
- Node color based on community.
- Node size from API.
- Click node: set selected artist.
- Hover node: highlight neighbors.
- Click empty canvas: clear selection.
- Provide loading and error states.

### `ArtistPanel.tsx`

Show:

- artist name
- image if available
- tags
- community label
- degree / similarity info
- button: “Expand neighborhood” placeholder for later

### `CommunityLegend.tsx`

Show:

- community labels
- number of nodes per community
- click community to filter/highlight

---

## UI behavior

Default page flow:

1. User lands on `/`.
2. Page shows hero text: “Discover music as a living map.”
3. Search bar centered.
4. User searches artist.
5. User selects artist.
6. Graph loads.
7. Graph fills screen.
8. Artist panel appears on node click.
9. Community legend appears bottom/right.
10. User can reset graph or search again.

---

## Styling

Keep styling simple and modern.

Use either:

- Tailwind CSS, or
- CSS modules, if Tailwind setup adds too much noise.

Visual style:

- Dark background.
- Graph canvas full viewport.
- Search bar floating top center.
- Side panel right.
- Community legend bottom left.
- Avoid hardcoding too many colors; use deterministic community color mapping.

---

## Docker Compose

Create `infra/docker-compose.yml` with:

- Postgres
- Redis

Example services:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: discovr
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

---

## Developer commands

Add README instructions:

```bash
# install JS deps
pnpm install

# start infra
docker compose -f infra/docker-compose.yml up -d

# run migrations
pnpm --filter api prisma migrate dev

# start API
pnpm --filter api dev

# start web
pnpm --filter web dev

# start graph worker
cd workers/graph
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

If using a simpler single Next.js app, adjust commands accordingly.

---

## Acceptance criteria

The implementation is acceptable when:

1. I can set `LASTFM_API_KEY` in `.env`.
2. I can start Postgres and Redis locally.
3. I can run the web app.
4. I can search for an artist such as “Radiohead”.
5. The app fetches similar artists from Last.fm.
6. The app displays at least 30 artist nodes.
7. The graph renders interactively in the browser.
8. Clicking a node opens an artist details panel.
9. Nodes have x/y positions from the graph worker or deterministic fallback layout.
10. Nodes are colored by community.
11. A graph snapshot is saved or cached.
12. Errors are handled without crashing the UI.

---

## Implementation priorities

Build in this exact order:

1. Create monorepo skeleton.
2. Create Postgres schema.
3. Implement Last.fm client.
4. Implement artist search/bootstrap.
5. Implement `/api/graphs/artist/:id`.
6. Implement Python worker `/graph/analyze`.
7. Connect API to worker.
8. Render static graph in React.
9. Add node click and artist panel.
10. Add community legend.
11. Add caching/snapshot persistence.
12. Add README.

---

## Non-goals for v0.1

Do not implement yet:

- user accounts
- Spotify login
- Apple Music integration
- global map of all music
- node2vec
- Graph Neural Networks
- payment/subscriptions
- mobile app
- production deployment
- real-time collaborative maps

---

## Code quality requirements

- Use TypeScript types for all API payloads.
- Keep API response contracts explicit.
- Avoid large untyped `any` objects.
- Isolate Last.fm logic in one service.
- Isolate graph transformation logic in one module.
- Add basic error boundaries/loading states.
- Make the app runnable locally from README.
- Prefer simple, working implementation over over-engineered abstractions.

---

## First task for Codex

Start by scaffolding the monorepo and implementing the vertical slice:

“Search Radiohead → fetch Last.fm similar artists → create graph payload → render interactive Sigma.js graph.”

After that, add the Python worker and replace temporary frontend/backend layout with igraph-generated communities and layout.
