"use client";

import { useEffect, useMemo, useRef } from "react";
import type Graphology from "graphology";
import type Sigma from "sigma";
import { communityColor } from "@/lib/graph";
import type { ArtistNode, GraphSnapshot } from "@/lib/types";

type Props = {
  graph: GraphSnapshot;
  selectedArtist: ArtistNode | null;
  onRecenterArtist: (artist: ArtistNode) => void;
  onSelectArtist: (artist: ArtistNode | null) => void;
};

export function GraphCanvas({ graph, selectedArtist, onRecenterArtist, onSelectArtist }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphologyRef = useRef<Graphology | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0) {
      return;
    }

    let renderer: Sigma | null = null;
    let animationFrame = 0;
    let cancelled = false;

    async function renderGraph() {
      const [{ default: Graph }, { default: SigmaRenderer }] = await Promise.all([import("graphology"), import("sigma")]);

      if (cancelled || !containerRef.current) {
        return;
      }

      const graphology = new Graph();
      const startedAt = performance.now();
      const neighborCount = Math.max(graph.nodes.length - 1, 1);

      graph.nodes.forEach((node, index) => {
        const neighborIndex = Math.max(index - 1, 0);
        const introAngle = (neighborIndex / neighborCount) * Math.PI * 2;
        const introRadius = node.id === graph.meta.seedArtistId ? 0 : 0.35 + (neighborIndex % 5) * 0.12;
        const introX = Math.cos(introAngle) * introRadius;
        const introY = Math.sin(introAngle) * introRadius;

        graphology.addNode(node.id, {
          label: node.label,
          x: introX,
          y: introY,
          introX,
          introY,
          targetX: node.x,
          targetY: node.y,
          driftPhase: index * 1.618,
          size: node.size,
          color: communityColor(node.community),
          highlighted: false
        });
      });

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
      graphologyRef.current = graphology;
      sigmaRef.current = renderer;

      renderer.on("clickNode", ({ node }) => {
        const artist = nodeById.get(node);

        if (!artist) {
          return;
        }

        onSelectArtist(artist);

        if (artist.id !== graph.meta.seedArtistId) {
          onRecenterArtist(artist);
        }
      });
      renderer.on("clickStage", () => onSelectArtist(null));

      function animate(now: number) {
        if (cancelled || !renderer) {
          return;
        }

        const elapsed = now - startedAt;
        const settle = Math.min(1, elapsed / 5200);
        const ease = settle < 0.5 ? 4 * settle ** 3 : 1 - (-2 * settle + 2) ** 3 / 2;
        const driftStrength = 0.012 * (0.25 + 0.75 * ease);

        graphology.forEachNode((nodeId, attributes) => {
          const introX = Number(attributes.introX ?? attributes.x ?? 0);
          const introY = Number(attributes.introY ?? attributes.y ?? 0);
          const targetX = Number(attributes.targetX ?? attributes.x ?? 0);
          const targetY = Number(attributes.targetY ?? attributes.y ?? 0);
          const phase = Number(attributes.driftPhase ?? 0);
          const driftX = Math.sin(now * 0.0012 + phase) * driftStrength;
          const driftY = Math.cos(now * 0.001 + phase) * driftStrength;
          const nextTargetX = introX * (1 - ease) + targetX * ease + driftX;
          const nextTargetY = introY * (1 - ease) + targetY * ease + driftY;
          const currentX = Number(attributes.x ?? 0);
          const currentY = Number(attributes.y ?? 0);

          graphology.setNodeAttribute(nodeId, "x", currentX + (nextTargetX - currentX) * 0.045);
          graphology.setNodeAttribute(nodeId, "y", currentY + (nextTargetY - currentY) * 0.045);
        });

        renderer.refresh();
        animationFrame = window.requestAnimationFrame(animate);
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    void renderGraph();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      graphologyRef.current = null;
      renderer?.kill();
      if (sigmaRef.current === renderer) {
        sigmaRef.current = null;
      }
    };
  }, [graph, nodeById, onRecenterArtist, onSelectArtist]);

  useEffect(() => {
    const graphology = graphologyRef.current;

    if (!graphology) {
      return;
    }

    graphology.forEachNode((nodeId) => {
      graphology.setNodeAttribute(nodeId, "highlighted", selectedArtist?.id === nodeId);
    });

    sigmaRef.current?.refresh();
  }, [selectedArtist]);

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
