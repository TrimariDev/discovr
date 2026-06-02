"use client";

import type { ArtistNode, GraphSnapshot } from "@/lib/types";

type Props = {
  artist: ArtistNode | null;
  graph: GraphSnapshot;
  onClose: () => void;
};

export function ArtistPanel({ artist, graph, onClose }: Props) {
  if (!artist) {
    return null;
  }

  const community = graph.communities.find((item) => item.id === artist.community);
  const degree = graph.edges.filter((edge) => edge.source === artist.id || edge.target === artist.id).length;

  return (
    <aside className="artistPanel floatingPanel panel">
      <button className="iconButton" type="button" aria-label="Close artist panel" onClick={onClose}>
        Close
      </button>
      <h2>{artist.name}</h2>
      <p>{community?.label ?? `Cluster ${artist.community}`}</p>
      <p>{degree} graph connections</p>
      <ul className="tagList">
        {artist.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <button className="iconButton" type="button">
        Expand neighborhood
      </button>
    </aside>
  );
}

