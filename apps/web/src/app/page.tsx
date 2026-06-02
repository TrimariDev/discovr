"use client";

import { useState } from "react";
import { ArtistPanel } from "@/components/ArtistPanel";
import { CommunityLegend } from "@/components/CommunityLegend";
import { GraphCanvas } from "@/components/GraphCanvas";
import { GraphControls } from "@/components/GraphControls";
import { SearchBar } from "@/components/SearchBar";
import type { ArtistNode, GraphSnapshot } from "@/lib/types";

const emptyGraph: GraphSnapshot = {
  status: "idle",
  graphId: null,
  nodes: [],
  edges: [],
  communities: [],
  meta: {
    seedArtistId: null,
    depth: 1,
    limit: 100,
    algorithm: "pending"
  }
};

export default function Home() {
  const [graph, setGraph] = useState<GraphSnapshot>(emptyGraph);
  const [selectedArtist, setSelectedArtist] = useState<ArtistNode | null>(null);

  return (
    <main className="appShell">
      <section className="topBar" aria-label="Artist search">
        <div>
          <p className="eyebrow">Discovr</p>
          <h1>Discover music as a living map.</h1>
        </div>
        <SearchBar onGraphLoaded={setGraph} onArtistSelected={setSelectedArtist} />
      </section>

      <GraphCanvas graph={graph} selectedArtist={selectedArtist} onSelectArtist={setSelectedArtist} />
      <GraphControls onReset={() => { setGraph(emptyGraph); setSelectedArtist(null); }} />
      <CommunityLegend communities={graph.communities} nodes={graph.nodes} />
      <ArtistPanel artist={selectedArtist} graph={graph} onClose={() => setSelectedArtist(null)} />
    </main>
  );
}

