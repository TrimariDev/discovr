"use client";

import { communityColor } from "@/lib/graph";
import type { GraphCommunity } from "@/lib/types";

type Props = {
  communities: GraphCommunity[];
  visible: boolean;
};

export function CommunityLegend({ communities, visible }: Props) {
  if (!visible || communities.length === 0) {
    return null;
  }

  const items = [...communities].sort((left, right) => left.id - right.id).slice(0, 8);

  return (
    <section className="communityLegend panel" aria-label="Community legend">
      <p className="communityLegendTitle">Clusters</p>
      <ul className="communityLegendList">
        {items.map((community) => (
          <li key={community.id}>
            <span className="communityLegendSwatch" style={{ backgroundColor: communityColor(community.id) }} />
            <span className="communityLegendLabel">{community.label || `Cluster ${community.id}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
