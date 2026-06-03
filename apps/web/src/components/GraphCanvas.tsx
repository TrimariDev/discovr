"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import type Graphology from "graphology";
import type Sigma from "sigma";
import {
  applyCommunitiesFromSnapshot,
  filterSelectionKey,
  syncNodeFilterVisuals,
  type GraphFilterContext
} from "@/lib/graphology-visual";
import { captureNodePositions, mountSigmaGraph } from "@/lib/graph-sigma-render";
import {
  focusCameraOnGraphPoint,
  lockGraphViewport,
  refreshPartial,
  repaintWithLockedCamera,
  restoreDefaultCamera,
  type CameraState
} from "@/lib/sigma-camera";
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
  const stopAnimationRef = useRef<(() => void) | null>(null);
  const onRecenterRef = useRef(onRecenterArtist);
  const onSelectRef = useRef(onSelectArtist);
  const defaultCameraRef = useRef<CameraState | null>(null);
  const preservedCameraRef = useRef<CameraState | null>(null);
  const lastAppliedFocusNonceRef = useRef(0);
  const filterContextRef = useRef<GraphFilterContext>({
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
    if (!containerRef.current || !graphStructureKey || graph.nodes.length === 0 || graph.status !== "ready") {
      stopAnimationRef.current?.();
      stopAnimationRef.current = null;
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphologyRef.current = null;
      defaultCameraRef.current = null;
      previousNodesRef.current = new Map();
      previousPositionsRef.current = new Map();
      return;
    }

    let cancelled = false;
    let mountedRenderer: Sigma | null = null;

    const readyGraph = graph;

    void (async () => {
      const preservedCamera = preservedCameraRef.current;
      preservedCameraRef.current = null;

      const mounted = await mountSigmaGraph({
        container: containerRef.current!,
        graph: readyGraph,
        previousNodes: previousNodesRef.current,
        previousPositions: previousPositionsRef.current,
        getFilter: () => filterContextRef.current,
        selectedArtistId: selectedArtistIdRef.current,
        preservedCamera,
        onSelectArtist: (artist) => onSelectRef.current(artist),
        onRecenterArtist: (artist) => onRecenterRef.current(artist),
        getHoveredNodeId: () => hoveredNodeRef.current,
        setHoveredNodeId: (nodeId) => {
          hoveredNodeRef.current = nodeId;
        }
      });

      if (cancelled) {
        mounted.stopAnimation();
        mounted.renderer.kill();
        return;
      }

      sigmaRef.current?.kill();
      mountedRenderer = mounted.renderer;
      graphologyRef.current = mounted.graphology;
      sigmaRef.current = mounted.renderer;
      defaultCameraRef.current = mounted.defaultCamera;
      stopAnimationRef.current = mounted.stopAnimation;

      prevTagFilterKeyRef.current = filterSelectionKey(filterContextRef.current.activeTagFilters);
      tagIndexSizeRef.current = Object.keys(filterContextRef.current.tagsByArtistId).length;
    })();

    return () => {
      cancelled = true;
      stopAnimationRef.current?.();
      stopAnimationRef.current = null;

      if (preserveViewportOnRecenterRef.current && sigmaRef.current) {
        preservedCameraRef.current = sigmaRef.current.getCamera().getState();
        preserveViewportOnRecenterRef.current = false;
      }

      if (graphologyRef.current) {
        previousPositionsRef.current = captureNodePositions(graphologyRef.current);
      }

      previousNodesRef.current = new Map(graph.nodes.map((node) => [node.id, node]));
      graphologyRef.current = null;
      defaultCameraRef.current = null;
      prevTagFilterKeyRef.current = "";
      tagIndexSizeRef.current = 0;
      mountedRenderer?.kill();

      if (sigmaRef.current === mountedRenderer) {
        sigmaRef.current = null;
      }
    };
  }, [graphStructureKey, graph.nodes.length, graph.meta.seedArtistId, preserveViewportOnRecenterRef]);

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
