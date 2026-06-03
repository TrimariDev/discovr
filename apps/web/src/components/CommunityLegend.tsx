"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { communityColor } from "@/lib/graph";
import { floatingPanelCardClassName, panelBodyClassName, panelHeaderClassName } from "@/lib/panel";
import type { GraphCommunity } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_CLUSTERS = 8;

type Props = {
  communities: GraphCommunity[];
  visible: boolean;
};

export function CommunityLegend({ communities, visible }: Props) {
  if (!visible || communities.length === 0) {
    return null;
  }

  const items = [...communities].sort((left, right) => left.id - right.id).slice(0, MAX_CLUSTERS);

  return (
    <Card
      className={cn("communityLegend h-fit max-h-none overflow-visible", floatingPanelCardClassName)}
      size="sm"
      aria-label="Community legend"
    >
      <CardHeader className={panelHeaderClassName}>
        <CardTitle className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
          Clusters
        </CardTitle>
      </CardHeader>

      <CardContent className={cn(panelBodyClassName, "overflow-visible")}>
        <ul className="communityLegendList">
          {items.map((community) => {
            const label = community.label || `Cluster ${community.id}`;

            return (
              <li key={community.id}>
                <span className="communityLegendSwatch" style={{ backgroundColor: communityColor(community.id) }} />
                <span className="communityLegendLabel" title={label}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
