"use client";

import { useEffect, useMemo, useRef } from "react";
import type Sigma from "sigma";
import { communityColor } from "@/lib/graph";
import type { ArtistNode, GraphSnapshot } from "@/lib/types";

type Props = {
  graph: GraphSnapshot;
  selectedArtist: ArtistNode | null;
  onSelectArtist: (artist: ArtistNode | null) => void;
};

export function GraphCanvas({ graph, selectedArtist, onSelectArtist }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0) {
      return;
    }

    let renderer: Sigma | null = null;
    let cancelled = false;

    async function renderGraph() {
      const [{ default: Graph }, { default: SigmaRenderer }] = await Promise.all([import("graphology"), import("sigma")]);

      if (cancelled || !containerRef.current) {
        return;
      }

      const graphology = new Graph();

      for (const node of graph.nodes) {
        graphology.addNode(node.id, {
          label: node.label,
          x: node.x,
          y: node.y,
          size: node.size,
          color: communityColor(node.community),
          highlighted: selectedArtist?.id === node.id
        });
      }

      for (const edge of graph.edges) {
        if (graphology.hasNode(edge.source) && graphology.hasNode(edge.target)) {
          graphology.addEdgeWithKey(edge.id, edge.source, edge.target, {
            label: edge.label,
            size: Math.max(1, edge.weight * 4),
            color: "rgba(255,255,255,0.22)"
          });
        }
      }

      sigmaRef.current?.kill();
      renderer = new SigmaRenderer(graphology, containerRef.current, {
        labelRenderedSizeThreshold: 100,
        renderEdgeLabels: false
      });
      sigmaRef.current = renderer;

      renderer.on("clickNode", ({ node }) => onSelectArtist(nodeById.get(node) ?? null));
      renderer.on("clickStage", () => onSelectArtist(null));
    }

    void renderGraph();

    return () => {
      cancelled = true;
      renderer?.kill();
      if (sigmaRef.current === renderer) {
        sigmaRef.current = null;
      }
    };
  }, [graph, nodeById, onSelectArtist, selectedArtist]);

  return (
    <section className="graphCanvas" aria-label="Artist graph">
      {graph.nodes.length === 0 ? (
        <div className="graphPlaceholder">
          {graph.status === "loading" ? "Loading graph..." : "Search for an artist to begin."}
        </div>
      ) : (
        <div ref={containerRef} className="graphCanvas" />
      )}
    </section>
  );
}
