import type { GraphSnapshot } from "@discovr/contracts";

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);

  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function findCachedGraphContainingNodes(source: string, target: string): GraphSnapshot | null {
  const now = Date.now();

  for (const [key, entry] of memoryCache) {
    if (!key.startsWith("graph:") || entry.expiresAt < now) {
      continue;
    }

    const graph = entry.value as GraphSnapshot;

    if (
      graph?.status === "ready" &&
      graph.nodes.some((node) => node.id === source) &&
      graph.nodes.some((node) => node.id === target)
    ) {
      return graph;
    }
  }

  return null;
}

