"use client";

import { useEffect, useMemo, useRef } from "react";
import type Graphology from "graphology";
import type Sigma from "sigma";
import { communityColorWithAlpha } from "@/lib/graph";
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
  const previousNodesRef = useRef(new Map<string, ArtistNode>());
  const previousPositionsRef = useRef(new Map<string, { x: number; y: number }>());
  const sigmaRef = useRef<Sigma | null>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0) {
      previousNodesRef.current = new Map();
      previousPositionsRef.current = new Map();
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
      const currentNodeIds = new Set(graph.nodes.map((node) => node.id));
      const displayNodes = [
        ...graph.nodes,
        ...Array.from(previousNodesRef.current.values()).filter((node) => !currentNodeIds.has(node.id))
      ];
      const previousPositions = previousPositionsRef.current;
      const previousSeedPosition = graph.meta.seedArtistId ? previousPositions.get(graph.meta.seedArtistId) : undefined;

      displayNodes.forEach((node, index) => {
        const isCurrent = currentNodeIds.has(node.id);
        const previousPosition = previousPositions.get(node.id);
        const neighborIndex = Math.max(index - 1, 0);
        const introAngle = (neighborIndex / neighborCount) * Math.PI * 2;
        const introRadius = node.id === graph.meta.seedArtistId ? 0 : 0.35 + (neighborIndex % 5) * 0.12;
        const fallbackIntroX = Math.cos(introAngle) * introRadius;
        const fallbackIntroY = Math.sin(introAngle) * introRadius;
        const seedOrbitRadius = node.id === graph.meta.seedArtistId ? 0 : 0.12 + (neighborIndex % 4) * 0.025;
        const seedOrbitX = (previousSeedPosition?.x ?? 0) + Math.cos(introAngle) * seedOrbitRadius;
        const seedOrbitY = (previousSeedPosition?.y ?? 0) + Math.sin(introAngle) * seedOrbitRadius;
        const introX = previousPosition?.x ?? (previousSeedPosition ? seedOrbitX : fallbackIntroX);
        const introY = previousPosition?.y ?? (previousSeedPosition ? seedOrbitY : fallbackIntroY);
        const introAlpha = previousPosition ? 1 : 0;
        const targetAlpha = isCurrent ? 1 : 0;
        const introSize = previousPosition ? node.size : Math.max(2, node.size * 0.2);
        const targetSize = isCurrent ? node.size : 0.2;

        graphology.addNode(node.id, {
          label: node.label,
          x: introX,
          y: introY,
          introX,
          introY,
          targetX: node.x,
          targetY: node.y,
          driftPhase: index * 1.618,
          introAlpha,
          introSize,
          targetAlpha,
          targetSize,
          size: introSize,
          color: communityColorWithAlpha(node.community, introAlpha),
          community: node.community,
          highlighted: false
        });
      });

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
          const introAlpha = Number(attributes.introAlpha ?? 1);
          const targetAlpha = Number(attributes.targetAlpha ?? 1);
          const introSize = Number(attributes.introSize ?? attributes.size ?? 1);
          const targetSize = Number(attributes.targetSize ?? attributes.size ?? 1);
          const community = Number(attributes.community ?? 0);
          const driftX = Math.sin(now * 0.0012 + phase) * driftStrength;
          const driftY = Math.cos(now * 0.001 + phase) * driftStrength;
          const nextTargetX = introX * (1 - ease) + targetX * ease + driftX;
          const nextTargetY = introY * (1 - ease) + targetY * ease + driftY;
          const alpha = introAlpha * (1 - ease) + targetAlpha * ease;
          const size = introSize * (1 - ease) + targetSize * ease;
          const currentX = Number(attributes.x ?? 0);
          const currentY = Number(attributes.y ?? 0);

          graphology.setNodeAttribute(nodeId, "x", currentX + (nextTargetX - currentX) * 0.045);
          graphology.setNodeAttribute(nodeId, "y", currentY + (nextTargetY - currentY) * 0.045);
          graphology.setNodeAttribute(nodeId, "size", size);
          graphology.setNodeAttribute(nodeId, "color", communityColorWithAlpha(community, alpha));
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
      if (graphologyRef.current) {
        const latestPositions = new Map<string, { x: number; y: number }>();

        graphologyRef.current.forEachNode((nodeId, attributes) => {
          latestPositions.set(nodeId, {
            x: Number(attributes.x ?? 0),
            y: Number(attributes.y ?? 0)
          });
        });

        previousPositionsRef.current = latestPositions;
      }
      previousNodesRef.current = new Map(graph.nodes.map((node) => [node.id, node]));
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
