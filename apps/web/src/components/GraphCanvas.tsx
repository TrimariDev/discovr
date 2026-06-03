"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import type Graphology from "graphology";
import type Sigma from "sigma";
import { titleCaseArtistName } from "@discovr/contracts";
import {
  buildNodeAdjacency,
  communityColorWithAlpha,
  computeGraphBBox,
  nodeMatchesTagFilters,
  tagFilterVisuals
} from "@/lib/graph";
import type { ArtistNode, GraphSnapshot } from "@/lib/types";

type Props = {
  graph: GraphSnapshot;
  selectedArtist: ArtistNode | null;
  activeTagFilters: string[];
  tagsByArtistId: Record<string, string[]>;
  viewResetNonce: number;
  focusSeedNonce: number;
  preserveViewportOnRecenterRef: MutableRefObject<boolean>;
  onRecenterArtist: (artist: ArtistNode) => void;
  onSelectArtist: (artist: ArtistNode | null) => void;
};

type FilterContext = {
  activeTagFilters: string[];
  tagsByArtistId: Record<string, string[]>;
  nodeById: Map<string, ArtistNode>;
};

function filterSelectionKey(filters: string[]) {
  return [...filters].sort().join("\0");
}

type CameraState = {
  x: number;
  y: number;
  angle: number;
  ratio: number;
};

type SigmaInternals = {
  settings: { autoRescale: boolean };
  customBBox: ReturnType<typeof computeGraphBBox>;
};

function setAutoRescale(renderer: Sigma, enabled: boolean) {
  (renderer as unknown as SigmaInternals).settings.autoRescale = enabled;
}

function disableAutoRescale(renderer: Sigma) {
  setAutoRescale(renderer, false);
}

function lockGraphViewport(renderer: Sigma, nodes: Array<{ x: number; y: number }>) {
  (renderer as unknown as SigmaInternals).customBBox = computeGraphBBox(nodes);
}

function refreshGraph(renderer: Sigma) {
  renderer.refresh();
}

function captureDefaultCamera(renderer: Sigma): CameraState {
  return renderer.getCamera().getState();
}

function restoreDefaultCamera(renderer: Sigma, state: CameraState) {
  renderer.getCamera().setState(state);
  refreshGraph(renderer);
}

/** Zoom toward a graph point while keeping it under the same viewport position. */
function focusCameraOnGraphPoint(
  renderer: Sigma,
  graphPoint: { x: number; y: number },
  zoomInFactor: number,
  baseline: CameraState
) {
  const camera = renderer.getCamera();
  const viewportPoint = renderer.graphToViewport(graphPoint);
  const focusRatio = camera.getBoundedRatio(baseline.ratio / zoomInFactor);
  const nextState = renderer.getViewportZoomedState(viewportPoint, focusRatio);

  camera.setState({ ...nextState, angle: baseline.angle });
  refreshGraph(renderer);
}

function applyTagFilterAttributes(
  nodeId: string,
  attributes: Record<string, unknown>,
  filter: FilterContext
): { color: string; label: string; hidden: boolean } {
  const community = Number(attributes.community ?? 0);
  const targetAlpha = Number(attributes.targetAlpha ?? 1);
  const displayAlpha = Number(attributes.displayAlpha ?? targetAlpha);
  const size = Number(attributes.size ?? 10);
  const originalLabel = String(attributes.originalLabel ?? attributes.label ?? "");
  const filterTags = filter.activeTagFilters;

  if (filterTags.length === 0 || targetAlpha <= 0.5) {
    return {
      color: communityColorWithAlpha(community, displayAlpha),
      label: originalLabel,
      hidden: false
    };
  }

  const tags = filter.tagsByArtistId[nodeId] ?? filter.nodeById.get(nodeId)?.tags;
  const match = nodeMatchesTagFilters(tags, filterTags);
  const visuals = tagFilterVisuals(match, displayAlpha, size);

  return {
    color: communityColorWithAlpha(community, visuals.alpha),
    label: visuals.showLabel ? originalLabel : "",
    hidden: visuals.hidden
  };
}

function syncNodeFilterVisuals(graphology: Graphology, filter: FilterContext) {
  graphology.forEachNode((nodeId, attributes) => {
    const attrs = attributes as Record<string, unknown>;
    const next = applyTagFilterAttributes(nodeId, attrs, filter);

    if (attrs.color !== next.color) {
      graphology.setNodeAttribute(nodeId, "color", next.color);
    }

    if (attrs.label !== next.label) {
      graphology.setNodeAttribute(nodeId, "label", next.label);
    }

    if (attrs.hidden !== next.hidden) {
      graphology.setNodeAttribute(nodeId, "hidden", next.hidden);
    }
  });
}

/** Filter colors only — labels/hidden stay stable between filter changes. */
function syncNodeFilterColors(graphology: Graphology, filter: FilterContext) {
  graphology.forEachNode((nodeId, attributes) => {
    const attrs = attributes as Record<string, unknown>;
    const nextColor = applyTagFilterAttributes(nodeId, attrs, filter).color;

    if (attrs.color !== nextColor) {
      graphology.setNodeAttribute(nodeId, "color", nextColor);
    }
  });
}

function applyCommunitiesFromSnapshot(graphology: Graphology, nodes: ArtistNode[], filter: FilterContext) {
  for (const node of nodes) {
    if (!graphology.hasNode(node.id)) {
      continue;
    }

    graphology.setNodeAttribute(node.id, "community", node.community);

    if (filter.activeTagFilters.length === 0) {
      const attrs = graphology.getNodeAttributes(node.id) as Record<string, unknown>;
      const alpha = Number(attrs.displayAlpha ?? attrs.targetAlpha ?? 1);
      graphology.setNodeAttribute(node.id, "color", communityColorWithAlpha(node.community, alpha));
    }
  }

  if (filter.activeTagFilters.length > 0) {
    syncNodeFilterVisuals(graphology, filter);
  }
}

function refreshPartial(renderer: Sigma, graphology: Graphology) {
  renderer.refresh({
    partialGraph: { nodes: graphology.nodes() },
    skipIndexation: true
  });
}

function paintDefaultNodeColors(
  graphology: Graphology,
  filter: FilterContext,
  hoveredNodeId: string | null,
  adjacency: Map<string, Set<string>>
) {
  if (filter.activeTagFilters.length > 0) {
    return;
  }

  const focus = new Set<string>();

  if (hoveredNodeId) {
    focus.add(hoveredNodeId);

    for (const peer of adjacency.get(hoveredNodeId) ?? []) {
      focus.add(peer);
    }
  }

  graphology.forEachNode((nodeId, attributes) => {
    const attrs = attributes as Record<string, unknown>;
    const community = Number(attrs.community ?? 0);
    const displayAlpha = Number(attrs.displayAlpha ?? 1);
    const alpha = hoveredNodeId ? (focus.has(nodeId) ? displayAlpha : displayAlpha * 0.28) : displayAlpha;
    const baseSize = Number(attrs.size ?? 10);
    const nextSize = hoveredNodeId === nodeId ? baseSize * 1.12 : baseSize;
    const originalLabel = String(attrs.originalLabel ?? attrs.label ?? "");
    const nextColor = communityColorWithAlpha(community, alpha);

    if (attrs.color !== nextColor) {
      graphology.setNodeAttribute(nodeId, "color", nextColor);
    }

    if (attrs.size !== nextSize) {
      graphology.setNodeAttribute(nodeId, "size", nextSize);
    }

    if (attrs.label !== originalLabel) {
      graphology.setNodeAttribute(nodeId, "label", originalLabel);
    }

    if (attrs.hidden) {
      graphology.setNodeAttribute(nodeId, "hidden", false);
    }
  });
}

function repaintWithLockedCamera(renderer: Sigma, graphology: Graphology) {
  const camera = renderer.getCamera();
  const snapshot: CameraState = camera.getState();
  const pinnedRatio = snapshot.ratio;

  camera.minRatio = pinnedRatio;
  camera.maxRatio = pinnedRatio;
  camera.setState(snapshot);

  refreshPartial(renderer, graphology);

  camera.setState(snapshot);
  camera.minRatio = null;
  camera.maxRatio = null;
}

export function GraphCanvas({
  graph,
  selectedArtist,
  activeTagFilters,
  tagsByArtistId,
  viewResetNonce,
  focusSeedNonce,
  preserveViewportOnRecenterRef,
  onRecenterArtist,
  onSelectArtist
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphologyRef = useRef<Graphology | null>(null);
  const previousNodesRef = useRef(new Map<string, ArtistNode>());
  const previousPositionsRef = useRef(new Map<string, { x: number; y: number }>());
  const sigmaRef = useRef<Sigma | null>(null);
  const prevTagFilterKeyRef = useRef("");
  const tagIndexSizeRef = useRef(0);
  const selectedArtistIdRef = useRef<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const adjacencyRef = useRef<Map<string, Set<string>>>(new Map());
  const onRecenterRef = useRef(onRecenterArtist);
  const onSelectRef = useRef(onSelectArtist);
  const defaultCameraRef = useRef<CameraState | null>(null);
  const preservedCameraRef = useRef<CameraState | null>(null);
  const lastAppliedFocusNonceRef = useRef(0);
  const filterContextRef = useRef<FilterContext>({
    activeTagFilters: [],
    tagsByArtistId: {},
    nodeById: new Map()
  });
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const graphStructureKey = graph.status === "ready" && graph.graphId ? graph.graphId : null;
  const graphEnriched = graph.meta.algorithm.includes("tag-edges");

  selectedArtistIdRef.current = selectedArtist?.id ?? null;
  onRecenterRef.current = onRecenterArtist;
  onSelectRef.current = onSelectArtist;

  filterContextRef.current = {
    activeTagFilters,
    tagsByArtistId,
    nodeById
  };

  const tagIndexSize = Object.keys(tagsByArtistId).length;
  const tagFilterKey = filterSelectionKey(activeTagFilters);

  useLayoutEffect(() => {
    const renderer = sigmaRef.current;
    const graphology = graphologyRef.current;

    if (!renderer || !graphology) {
      return;
    }

    const filterChanged = prevTagFilterKeyRef.current !== tagFilterKey;
    const tagsGrewWhileFiltering =
      activeTagFilters.length > 0 && tagIndexSize > tagIndexSizeRef.current && tagIndexSizeRef.current > 0;

    prevTagFilterKeyRef.current = tagFilterKey;
    tagIndexSizeRef.current = tagIndexSize;

    if (!filterChanged && !tagsGrewWhileFiltering) {
      return;
    }

    syncNodeFilterVisuals(graphology, filterContextRef.current);
    repaintWithLockedCamera(renderer, graphology);
  }, [activeTagFilters, tagFilterKey, tagIndexSize]);

  useEffect(() => {
    const graphology = graphologyRef.current;
    const renderer = sigmaRef.current;

    if (!graphology || !renderer || graph.status !== "ready" || !graphEnriched) {
      return;
    }

    applyCommunitiesFromSnapshot(graphology, graph.nodes, filterContextRef.current);
    refreshPartial(renderer, graphology);
  }, [graphStructureKey, graphEnriched, graph.nodes, graph.status]);

  useEffect(() => {
    const graphology = graphologyRef.current;
    const renderer = sigmaRef.current;
    const selectedId = selectedArtist?.id ?? null;

    if (!graphology || !renderer) {
      return;
    }

    graphology.forEachNode((nodeId) => {
      graphology.setNodeAttribute(nodeId, "highlighted", nodeId === selectedId);
    });
    refreshPartial(renderer, graphology);
  }, [selectedArtist?.id]);

  useEffect(() => {
    const renderer = sigmaRef.current;
    const graphology = graphologyRef.current;

    if (!renderer || !graphology || graph.status !== "ready" || viewResetNonce === 0) {
      return;
    }

    const saved = defaultCameraRef.current;

    if (!saved) {
      return;
    }

    restoreDefaultCamera(renderer, saved);
    refreshPartial(renderer, graphology);
  }, [viewResetNonce, graph.status]);

  useEffect(() => {
    const renderer = sigmaRef.current;
    const graphology = graphologyRef.current;
    const seedId = graph.meta.seedArtistId;

    if (
      !renderer ||
      !graphology ||
      graph.status !== "ready" ||
      focusSeedNonce === 0 ||
      focusSeedNonce === lastAppliedFocusNonceRef.current ||
      !seedId
    ) {
      return;
    }

    if (!graphology.hasNode(seedId)) {
      return;
    }

    const seedNode = graph.nodes.find((node) => node.id === seedId);

    if (!seedNode) {
      return;
    }

    lastAppliedFocusNonceRef.current = focusSeedNonce;

    const baseline = defaultCameraRef.current ?? renderer.getCamera().getState();

    lockGraphViewport(renderer, graph.nodes.map((node) => ({ x: node.x, y: node.y })));
    focusCameraOnGraphPoint(renderer, { x: seedNode.x, y: seedNode.y }, 2.4, baseline);
    refreshPartial(renderer, graphology);
  }, [focusSeedNonce, graph.status, graph.meta.seedArtistId, graph.nodes]);

  useEffect(() => {
    if (!containerRef.current || !graphStructureKey || graph.nodes.length === 0) {
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphologyRef.current = null;
      defaultCameraRef.current = null;
      previousNodesRef.current = new Map();
      previousPositionsRef.current = new Map();
      return;
    }

    let renderer: Sigma | null = null;
    let animationFrame = 0;
    let cancelled = false;
    let frameCount = 0;

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
      const selectedId = selectedArtistIdRef.current;

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

      sigmaRef.current?.kill();
      renderer = new SigmaRenderer(graphology, containerRef.current, {
        labelRenderedSizeThreshold: 100,
        renderEdgeLabels: false,
        autoRescale: true
      });
      graphologyRef.current = graphology;
      sigmaRef.current = renderer;
      adjacencyRef.current = buildNodeAdjacency(graph.edges);
      hoveredNodeRef.current = null;
      lockGraphViewport(renderer, graph.nodes.map((node) => ({ x: node.x, y: node.y })));

      const repaintHover = () => {
        if (!renderer) {
          return;
        }

        paintDefaultNodeColors(
          graphology,
          filterContextRef.current,
          hoveredNodeRef.current,
          adjacencyRef.current
        );
        refreshPartial(renderer, graphology);
      };

      renderer.on("enterNode", ({ node }) => {
        if (filterContextRef.current.activeTagFilters.length > 0) {
          return;
        }

        hoveredNodeRef.current = node;
        repaintHover();
      });
      renderer.on("leaveNode", () => {
        hoveredNodeRef.current = null;
        repaintHover();
      });

      renderer.on("clickNode", ({ node }) => {
        const artist = filterContextRef.current.nodeById.get(node);

        if (!artist) {
          return;
        }

        onSelectRef.current(artist);

        if (artist.id !== graph.meta.seedArtistId) {
          onRecenterRef.current(artist);
        }
      });
      renderer.on("clickStage", () => onSelectRef.current(null));

      syncNodeFilterVisuals(graphology, filterContextRef.current);
      renderer.refresh();

      const preservedCamera = preservedCameraRef.current;
      preservedCameraRef.current = null;

      if (preservedCamera) {
        renderer.getCamera().setState(preservedCamera);
        defaultCameraRef.current = preservedCamera;
      } else {
        defaultCameraRef.current = captureDefaultCamera(renderer);
      }

      disableAutoRescale(renderer);

      prevTagFilterKeyRef.current = filterSelectionKey(filterContextRef.current.activeTagFilters);
      tagIndexSizeRef.current = Object.keys(filterContextRef.current.tagsByArtistId).length;

      function animate(now: number) {
        if (cancelled || !renderer) {
          return;
        }

        frameCount += 1;
        const elapsed = now - startedAt;
        const settle = Math.min(1, elapsed / 3600);
        const ease = settle < 0.5 ? 4 * settle ** 3 : 1 - (-2 * settle + 2) ** 3 / 2;
        const driftStrength = settle >= 1 ? 0 : 0.012 * (0.25 + 0.75 * ease);
        const filter = filterContextRef.current;
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

          if (!filterActive) {
            // Colors/size for hover are applied in paintDefaultNodeColors after this loop.
          }
        });

        if (!filterActive) {
          paintDefaultNodeColors(
            graphology,
            filter,
            hoveredNodeRef.current,
            adjacencyRef.current
          );
        }

        if (filterActive) {
          syncNodeFilterColors(graphology, filter);
        }

        const animating = settle < 1;
        if (animating || frameCount % 2 === 0) {
          refreshPartial(renderer, graphology);
        }

        animationFrame = window.requestAnimationFrame(animate);
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    void renderGraph();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      if (preserveViewportOnRecenterRef.current && sigmaRef.current) {
        preservedCameraRef.current = sigmaRef.current.getCamera().getState();
        preserveViewportOnRecenterRef.current = false;
      }

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
      defaultCameraRef.current = null;
      prevTagFilterKeyRef.current = "";
      tagIndexSizeRef.current = 0;
      renderer?.kill();
      if (sigmaRef.current === renderer) {
        sigmaRef.current = null;
      }
    };
  }, [graphStructureKey, graph.nodes.length, graph.meta.seedArtistId]);

  const placeholder =
    graph.status === "loading"
      ? { title: "Building map…", hint: "Fetching similar artists" }
      : graph.status === "error"
        ? { title: "Could not load graph", hint: "Try another artist from search" }
        : { title: "Search for an artist to begin", hint: "Type a name in the search field" };

  const showPlaceholder = graph.nodes.length === 0;

  return (
    <section className="graphCanvas" aria-label="Artist graph">
      <div ref={containerRef} className="graphCanvasSurface" />
      {showPlaceholder && (
        <div className="graphPlaceholder" role="status">
          {graph.status === "loading" && <span className="graphSpinner" aria-hidden="true" />}
          <strong>{placeholder.title}</strong>
          {placeholder.hint && <p>{placeholder.hint}</p>}
        </div>
      )}
    </section>
  );
}
