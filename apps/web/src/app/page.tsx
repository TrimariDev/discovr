"use client";

import { useCallback, useEffect, useState } from "react";
import { ArtistPanel } from "@/components/ArtistPanel";
import { CommunityLegend } from "@/components/CommunityLegend";
import { GraphCanvas } from "@/components/GraphCanvas";
import { GraphControls } from "@/components/GraphControls";
import { SearchBar } from "@/components/SearchBar";
import { enrichGraphStructure, loadArtistGraph } from "@/lib/api";
import type { ArtistNode, ArtistSearchResult, GraphSnapshot } from "@/lib/types";

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
  const [panelArtist, setPanelArtist] = useState<Pick<ArtistSearchResult, "id" | "name" | "mbid"> | null>(null);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [tagsByArtistId, setTagsByArtistId] = useState<Record<string, string[]>>({});
  const [tagsEnrichmentStatus, setTagsEnrichmentStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [viewResetNonce, setViewResetNonce] = useState(0);
  const [focusSeedNonce, setFocusSeedNonce] = useState(0);

  const loadGraphForArtist = useCallback(async (
    artist: Pick<ArtistNode, "id" | "name">,
    options: { preserveCurrentGraph?: boolean } = {}
  ) => {
    if (!options.preserveCurrentGraph) {
      setSelectedArtist(null);
      setGraph({
        status: "loading",
        graphId: null,
        nodes: [],
        edges: [],
        communities: [],
        meta: {
          seedArtistId: artist.id,
          depth: 1,
          limit: 100,
          algorithm: "loading"
        }
      });
    }

    try {
      setGraph(await loadArtistGraph(artist.id));
      if (!options.preserveCurrentGraph) {
        setSelectedArtist(null);
      }
    } catch {
      if (!options.preserveCurrentGraph) {
        setGraph({
          status: "error",
          graphId: null,
          nodes: [],
          edges: [],
          communities: [],
          meta: {
            seedArtistId: artist.id,
            depth: 1,
            limit: 100,
            algorithm: "error"
          }
        });
      }
    }
  }, []);

  const recenterArtist = useCallback((artist: ArtistNode) => {
    void loadGraphForArtist(artist, { preserveCurrentGraph: true });
  }, [loadGraphForArtist]);

  useEffect(() => {
    if (graph.status === "loading") {
      setTagsByArtistId({});
      setActiveTagFilters([]);
      setTagsEnrichmentStatus("idle");
    }
  }, [graph.status]);

  useEffect(() => {
    if (graph.status !== "ready" || graph.nodes.length === 0) {
      return;
    }

    const tagsFromGraph = Object.fromEntries(
      graph.nodes.filter((node) => node.tags.length > 0).map((node) => [node.id, node.tags])
    );

    if (graph.meta.algorithm.includes("tag-edges")) {
      if (Object.keys(tagsFromGraph).length > 0) {
        setTagsByArtistId((current) => ({ ...tagsFromGraph, ...current }));
      }
      setTagsEnrichmentStatus("ready");
      return;
    }

    let cancelled = false;
    const graphId = graph.graphId;

    setTagsEnrichmentStatus("loading");

    void (async () => {
      try {
        const payload = await enrichGraphStructure({ graph });

        if (cancelled) {
          return;
        }

        setGraph((current) => {
          if (current.graphId !== graphId || current.status !== "ready") {
            return current;
          }

          return {
            ...current,
            nodes: payload.nodes,
            edges: payload.edges,
            communities: payload.communities,
            meta: { ...current.meta, algorithm: payload.algorithm }
          };
        });
        setTagsByArtistId((current) => ({ ...current, ...payload.tagsByArtistId }));
        setTagsEnrichmentStatus("ready");
      } catch {
        if (!cancelled) {
          setTagsEnrichmentStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [graph.graphId, graph.status, graph.meta.algorithm, graph.nodes.length]);

  return (
    <main className="appShell">
      <section className="topLeftHeader panel" aria-label="Title">
        <p className="eyebrow">Discovr</p>
        <h1>
          Discover music
          <br />
          as a living map
        </h1>
      </section>

      <section className="topRightSearch" aria-label="Artist search">
        <SearchBar
          onGraphLoaded={setGraph}
          onArtistSelected={(artist) => {
            setSelectedArtist(null);
            setPanelArtist(artist);
          }}
          onClear={() => {
            setGraph(emptyGraph);
            setSelectedArtist(null);
            setPanelArtist(null);
            setTagsByArtistId({});
            setActiveTagFilters([]);
            setTagsEnrichmentStatus("idle");
          }}
        />
        {graph.status === "ready" && graph.nodes.length > 0 && tagsEnrichmentStatus !== "idle" && (
          <p className="tagEnrichmentStatus" aria-live="polite">
            {tagsEnrichmentStatus === "loading" && "Indexing artist tags…"}
            {tagsEnrichmentStatus === "ready" && `${Object.keys(tagsByArtistId).length} artists tagged — click tags in the panel to filter (combine multiple)`}
            {tagsEnrichmentStatus === "error" && "Tag indexing failed"}
          </p>
        )}
      </section>

      <CommunityLegend communities={graph.communities} visible={graph.status === "ready" && graph.nodes.length > 0} />

      <GraphControls
        visible={graph.status === "ready" && graph.nodes.length > 0}
        hasActiveFilters={activeTagFilters.length > 0}
        onResetView={() => setViewResetNonce((value) => value + 1)}
        onFocusSeed={() => setFocusSeedNonce((value) => value + 1)}
        onClearFilters={() => setActiveTagFilters([])}
      />

      <GraphCanvas
        graph={graph}
        selectedArtist={selectedArtist}
        activeTagFilters={activeTagFilters}
        tagsByArtistId={tagsByArtistId}
        viewResetNonce={viewResetNonce}
        focusSeedNonce={focusSeedNonce}
        onRecenterArtist={recenterArtist}
        onSelectArtist={(artist) => {
          setSelectedArtist(artist);
          setPanelArtist(artist ? { id: artist.id, name: artist.name, mbid: (artist as { mbid?: string | null }).mbid ?? null } : null);
        }}
      />
      <ArtistPanel
        artist={panelArtist}
        activeTagFilters={activeTagFilters}
        onToggleTagFilter={(tag) => {
          const normalized = tag.trim().toLowerCase();
          setActiveTagFilters((current) =>
            current.includes(normalized) ? current.filter((entry) => entry !== normalized) : [...current, normalized]
          );
        }}
        onArtistTags={(artistId, tags) => {
          setTagsByArtistId((current) => {
            const existing = current[artistId];
            const normalized = tags.map((value) => value.trim()).filter(Boolean);
            if (existing && existing.join("|") === normalized.join("|")) {
              return current;
            }
            return { ...current, [artistId]: normalized };
          });
        }}
        onClose={() => { setSelectedArtist(null); setPanelArtist(null); }}
      />
    </main>
  );
}
