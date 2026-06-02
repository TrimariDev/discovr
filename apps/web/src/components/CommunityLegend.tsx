"use client";

import { communityColor } from "@/lib/graph";
import type { ArtistNode, Community } from "@/lib/types";

type Props = {
  communities: Community[];
  nodes: ArtistNode[];
};

export function CommunityLegend({ communities, nodes }: Props) {
  if (communities.length === 0) {
    return null;
  }

  return (
    <aside className="legend floatingPanel panel" aria-label="Communities">
      <strong>Communities</strong>
      <ul className="legendList">
        {communities.map((community) => {
          const count = nodes.filter((node) => node.community === community.id).length;
          return (
            <li key={community.id} style={{ borderColor: communityColor(community.id) }}>
              {community.label} ({count})
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

