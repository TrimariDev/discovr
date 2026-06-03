export const communityPalette = [
  "#4dd7a8",
  "#7cc7ff",
  "#ffcf5a",
  "#ff7f9f",
  "#b8a1ff",
  "#7fe7f0",
  "#f59f68"
] as const;

const palette = communityPalette;

export function computeGraphBBox(nodes: Array<{ x: number; y: number }>) {
  if (nodes.length === 0) {
    return { x: [-1, 1] as [number, number], y: [-1, 1] as [number, number] };
  }

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const node of nodes) {
    xMin = Math.min(xMin, node.x);
    xMax = Math.max(xMax, node.x);
    yMin = Math.min(yMin, node.y);
    yMax = Math.max(yMax, node.y);
  }

  const pad = 0.15;
  /** Extra padding on the right shifts the graph ~25% left in the viewport. */
  const padRight = pad + 0.25;
  const xSpan = Math.max(xMax - xMin, 0.35);
  const ySpan = Math.max(yMax - yMin, 0.35);

  return {
    x: [xMin - xSpan * pad, xMax + xSpan * padRight] as [number, number],
    y: [yMin - ySpan * pad, yMax + ySpan * pad] as [number, number]
  };
}

export function communityColor(communityId: number) {
  return communityPalette[Math.abs(communityId) % communityPalette.length];
}

export function buildNodeAdjacency(edges: Array<{ source: string; target: string }>) {
  const adjacency = new Map<string, Set<string>>();

  const link = (left: string, right: string) => {
    const leftNeighbors = adjacency.get(left) ?? new Set<string>();
    leftNeighbors.add(right);
    adjacency.set(left, leftNeighbors);
  };

  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  return adjacency;
}

export function communityColorWithAlpha(communityId: number, alpha: number) {
  const color = communityColor(communityId);
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

function normalizeTagName(tag: string) {
  return tag.trim().toLowerCase();
}

/** null = tags unknown, true/false = match result (single tag). */
export function nodeMatchesTagFilter(tags: string[] | undefined, filterTag: string): boolean | null {
  return nodeMatchesTagFilters(tags, [filterTag]);
}

/**
 * null = artist tags unknown.
 * true = artist has every selected filter tag (AND).
 * false = missing at least one selected tag.
 */
export function nodeMatchesTagFilters(tags: string[] | undefined, filterTags: string[]): boolean | null {
  const needles = filterTags.map(normalizeTagName).filter(Boolean);

  if (needles.length === 0) {
    return null;
  }

  if (!tags || tags.length === 0) {
    return null;
  }

  const artistTags = new Set(tags.map(normalizeTagName));
  return needles.every((needle) => artistTags.has(needle));
}

export function tagFilterVisuals(match: boolean | null, baseAlpha: number, baseSize: number) {
  // When filtering, only explicit tag matches stay visible; unknown tags are treated as non-matches.
  if (match === true) {
    return {
      alpha: baseAlpha,
      size: baseSize,
      showLabel: true,
      hidden: false
    };
  }

  return {
    alpha: 0.04,
    size: baseSize,
    showLabel: false,
    hidden: true
  };
}
