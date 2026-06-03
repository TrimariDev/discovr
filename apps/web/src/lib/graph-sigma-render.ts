import type Graphology from "graphology";
import type Sigma from "sigma";
import { titleCaseArtistName } from "@discovr/contracts";
import { buildNodeAdjacency, communityColorWithAlpha } from "@/lib/graph";
import {
  paintDefaultNodeColors,
  syncNodeFilterColors,
  syncNodeFilterVisuals,
  type GraphFilterContext
} from "@/lib/graphology-visual";
import {
  captureDefaultCamera,
  disableAutoRescale,
  lockGraphViewport,
  refreshPartial,
  type CameraState
} from "@/lib/sigma-camera";
import type { ArtistNode, GraphSnapshot } from "@/lib/types";

type ReadyGraph = Extract<GraphSnapshot, { status: "ready" }>;

export type GraphSigmaMountInput = {
  container: HTMLDivElement;
  graph: ReadyGraph;
  previousNodes: Map<string, ArtistNode>;
  previousPositions: Map<string, { x: number; y: number }>;
  getFilter: () => GraphFilterContext;
  selectedArtistId: string | null;
  preservedCamera: CameraState | null;
  onSelectArtist: (artist: ArtistNode | null) => void;
  onRecenterArtist: (artist: ArtistNode) => void;
  getHoveredNodeId: () => string | null;
  setHoveredNodeId: (nodeId: string | null) => void;
};

export type GraphSigmaMountResult = {
  renderer: Sigma;
  graphology: Graphology;
  defaultCamera: CameraState;
  adjacency: Map<string, Set<string>>;
  stopAnimation: () => void;
};

function populateGraphologyNodes(
  graphology: Graphology,
  graph: ReadyGraph,
  displayNodes: ArtistNode[],
  currentNodeIds: Set<string>,
  previousPositions: Map<string, { x: number; y: number }>,
  selectedId: string | null
) {
  const neighborCount = Math.max(graph.nodes.length - 1, 1);
  const previousSeedPosition = graph.meta.seedArtistId
    ? previousPositions.get(graph.meta.seedArtistId)
    : undefined;

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
    const displayLabel = titleCaseArtistName(node.label);

    graphology.addNode(node.id, {
      label: displayLabel,
      originalLabel: displayLabel,
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
      displayAlpha: introAlpha,
      color: communityColorWithAlpha(node.community, introAlpha),
      community: node.community,
      highlighted: selectedId === node.id
    });
  });
}

function startIntroAnimation(
  renderer: Sigma,
  graphology: Graphology,
  getFilter: () => GraphFilterContext,
  getHoveredNodeId: () => string | null,
  adjacency: Map<string, Set<string>>
) {
  const startedAt = performance.now();
  let frameCount = 0;
  let animationFrame = 0;
  let cancelled = false;

  function animate(now: number) {
    if (cancelled) {
      return;
    }

    frameCount += 1;
    const elapsed = now - startedAt;
    const settle = Math.min(1, elapsed / 3600);
    const ease = settle < 0.5 ? 4 * settle ** 3 : 1 - (-2 * settle + 2) ** 3 / 2;
    const driftStrength = settle >= 1 ? 0 : 0.012 * (0.25 + 0.75 * ease);
    const filter = getFilter();
    const filterActive = filter.activeTagFilters.length > 0;

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
      const driftX = Math.sin(now * 0.0012 + phase) * driftStrength;
      const driftY = Math.cos(now * 0.001 + phase) * driftStrength;
      const nextTargetX = introX * (1 - ease) + targetX * ease + driftX;
      const nextTargetY = introY * (1 - ease) + targetY * ease + driftY;
      const displayAlpha = introAlpha * (1 - ease) + targetAlpha * ease;
      const size = introSize * (1 - ease) + targetSize * ease;
      const currentX = Number(attributes.x ?? 0);
      const currentY = Number(attributes.y ?? 0);
      const nextX = currentX + (nextTargetX - currentX) * 0.045;
      const nextY = currentY + (nextTargetY - currentY) * 0.045;

      if (nextX !== currentX) {
        graphology.setNodeAttribute(nodeId, "x", nextX);
      }

      if (nextY !== currentY) {
        graphology.setNodeAttribute(nodeId, "y", nextY);
      }

      if (attributes.size !== size) {
        graphology.setNodeAttribute(nodeId, "size", size);
      }

      if (attributes.displayAlpha !== displayAlpha) {
        graphology.setNodeAttribute(nodeId, "displayAlpha", displayAlpha);
      }
    });

    if (!filterActive) {
      paintDefaultNodeColors(graphology, filter, getHoveredNodeId(), adjacency);
    } else {
      syncNodeFilterColors(graphology, filter);
    }

    const animating = settle < 1;

    if (animating || frameCount % 2 === 0) {
      refreshPartial(renderer, graphology);
    }

    animationFrame = window.requestAnimationFrame(animate);
  }

  animationFrame = window.requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
  };
}

export async function mountSigmaGraph(input: GraphSigmaMountInput): Promise<GraphSigmaMountResult> {
  const [{ default: Graph }, { default: SigmaRenderer }] = await Promise.all([
    import("graphology"),
    import("sigma")
  ]);

  const graphology = new Graph();
  const currentNodeIds = new Set(input.graph.nodes.map((node) => node.id));
  const displayNodes = [
    ...input.graph.nodes,
    ...Array.from(input.previousNodes.values()).filter((node) => !currentNodeIds.has(node.id))
  ];

  populateGraphologyNodes(
    graphology,
    input.graph,
    displayNodes,
    currentNodeIds,
    input.previousPositions,
    input.selectedArtistId
  );

  const renderer = new SigmaRenderer(graphology, input.container, {
    labelRenderedSizeThreshold: 100,
    renderEdgeLabels: false,
    autoRescale: true
  });

  const adjacency = buildNodeAdjacency(input.graph.edges);
  input.setHoveredNodeId(null);
  lockGraphViewport(renderer, input.graph.nodes.map((node) => ({ x: node.x, y: node.y })));

  const repaintHover = () => {
    paintDefaultNodeColors(graphology, input.getFilter(), input.getHoveredNodeId(), adjacency);
    refreshPartial(renderer, graphology);
  };

  renderer.on("enterNode", ({ node }) => {
    if (input.getFilter().activeTagFilters.length > 0) {
      return;
    }

    input.setHoveredNodeId(node);
    repaintHover();
  });
  renderer.on("leaveNode", () => {
    input.setHoveredNodeId(null);
    repaintHover();
  });

  renderer.on("clickNode", ({ node }) => {
    const artist = input.getFilter().nodeById.get(node);

    if (!artist) {
      return;
    }

    input.onSelectArtist(artist);

    if (artist.id !== input.graph.meta.seedArtistId) {
      input.onRecenterArtist(artist);
    }
  });
  renderer.on("clickStage", () => input.onSelectArtist(null));

  syncNodeFilterVisuals(graphology, input.getFilter());
  renderer.refresh();

  if (input.preservedCamera) {
    renderer.getCamera().setState(input.preservedCamera);
  }

  const defaultCamera = input.preservedCamera ?? captureDefaultCamera(renderer);
  disableAutoRescale(renderer);

  const stopAnimation = startIntroAnimation(renderer, graphology, input.getFilter, input.getHoveredNodeId, adjacency);

  return { renderer, graphology, defaultCamera, adjacency, stopAnimation };
}

export function captureNodePositions(graphology: Graphology) {
  const latestPositions = new Map<string, { x: number; y: number }>();

  graphology.forEachNode((nodeId, attributes) => {
    latestPositions.set(nodeId, {
      x: Number(attributes.x ?? 0),
      y: Number(attributes.y ?? 0)
    });
  });

  return latestPositions;
}
