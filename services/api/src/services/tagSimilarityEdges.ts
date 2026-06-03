import type { GraphEdge } from "@discovr/contracts";

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

/**
 * Connect similar artists that share Last.fm tags (inverse document frequency weighting).
 * Skips overly common tags so "rock" does not connect the entire graph.
 */
export function buildTagSimilarityEdges(
  tagsByArtistId: Record<string, string[]>,
  options: { maxEdgesPerNode?: number; minWeight?: number; maxTagArtistShare?: number } = {}
): GraphEdge[] {
  const maxEdgesPerNode = options.maxEdgesPerNode ?? 8;
  const minWeight = options.minWeight ?? 0.22;
  const maxTagArtistShare = options.maxTagArtistShare ?? 0.35;

  const artistIds = Object.keys(tagsByArtistId);
  const artistCount = artistIds.length;

  if (artistCount < 2) {
    return [];
  }

  const tagToArtists = new Map<string, string[]>();

  for (const [artistId, tags] of Object.entries(tagsByArtistId)) {
    for (const tag of new Set(tags.map(normalizeTag).filter(Boolean))) {
      const bucket = tagToArtists.get(tag) ?? [];
      bucket.push(artistId);
      tagToArtists.set(tag, bucket);
    }
  }

  const pairScore = new Map<string, number>();

  for (const [tag, artists] of tagToArtists) {
    const frequency = artists.length;

    if (frequency < 2 || frequency / artistCount > maxTagArtistShare) {
      continue;
    }

    const idf = 1 / Math.log2(frequency + 1);

    for (let left = 0; left < artists.length; left += 1) {
      for (let right = left + 1; right < artists.length; right += 1) {
        const source = artists[left]!;
        const target = artists[right]!;
        const key = source < target ? `${source}::${target}` : `${target}::${source}`;
        pairScore.set(key, (pairScore.get(key) ?? 0) + idf);
      }
    }
  }

  const rankedByArtist = new Map<string, Array<{ peer: string; weight: number; key: string }>>();

  for (const [key, rawScore] of pairScore) {
    const weight = Math.min(1, rawScore / 1.75);

    if (weight < minWeight) {
      continue;
    }

    const [left, right] = key.split("::") as [string, string];
    const leftPeers = rankedByArtist.get(left) ?? [];
    leftPeers.push({ peer: right, weight, key });
    rankedByArtist.set(left, leftPeers);

    const rightPeers = rankedByArtist.get(right) ?? [];
    rightPeers.push({ peer: left, weight, key });
    rankedByArtist.set(right, rightPeers);
  }

  const chosen = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const [nodeId, peers] of rankedByArtist) {
    peers.sort((left, right) => right.weight - left.weight);

    let added = 0;

    for (const { peer, weight, key } of peers) {
      if (added >= maxEdgesPerNode || chosen.has(key)) {
        continue;
      }

      chosen.add(key);
      const [source, target] = key.split("::") as [string, string];

      edges.push({
        id: `tag-${source}-${target}`,
        source,
        target,
        weight,
        label: "shared tags"
      });

      added += 1;
    }
  }

  return edges;
}
