import type Graphology from "graphology";
import {
  communityColorWithAlpha,
  nodeMatchesTagFilters,
  tagFilterVisuals
} from "@/lib/graph";
import type { ArtistNode } from "@/lib/types";

export type GraphFilterContext = {
  activeTagFilters: string[];
  tagsByArtistId: Record<string, string[]>;
  nodeById: Map<string, ArtistNode>;
};

export function filterSelectionKey(filters: string[]) {
  return [...filters].sort().join("\0");
}

function applyTagFilterAttributes(
  nodeId: string,
  attributes: Record<string, unknown>,
  filter: GraphFilterContext
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

export function syncNodeFilterVisuals(graphology: Graphology, filter: GraphFilterContext) {
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
export function syncNodeFilterColors(graphology: Graphology, filter: GraphFilterContext) {
  graphology.forEachNode((nodeId, attributes) => {
    const attrs = attributes as Record<string, unknown>;
    const nextColor = applyTagFilterAttributes(nodeId, attrs, filter).color;

    if (attrs.color !== nextColor) {
      graphology.setNodeAttribute(nodeId, "color", nextColor);
    }
  });
}

export function applyCommunitiesFromSnapshot(
  graphology: Graphology,
  nodes: ArtistNode[],
  filter: GraphFilterContext
) {
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

export function paintDefaultNodeColors(
  graphology: Graphology,
  filter: GraphFilterContext,
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
