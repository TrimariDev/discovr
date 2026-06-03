from collections import Counter, defaultdict
from igraph import Graph

from .models import GraphCommunity, GraphNodeInput


def detect_communities(graph: Graph) -> list[int]:
    if graph.vcount() == 0:
        return []

    try:
        return list(graph.community_leiden(weights="weight").membership)
    except Exception:
        pass

    try:
        return list(graph.community_multilevel(weights="weight").membership)
    except Exception:
        return [0 for _ in range(graph.vcount())]


def label_communities(nodes: list[GraphNodeInput], memberships: list[int]) -> list[GraphCommunity]:
    tags_by_community: dict[int, Counter[str]] = defaultdict(Counter)

    for node, community_id in zip(nodes, memberships, strict=False):
        tags_by_community[community_id].update(node.tags)

    communities: list[GraphCommunity] = []
    seen_label_keys: set[str] = set()
    for community_id in sorted(set(memberships)):
        top_tags = [tag for tag, _count in tags_by_community[community_id].most_common(3)]
        if top_tags:
            label_key = "|".join(sorted(tag.strip().lower() for tag in top_tags))
            if label_key in seen_label_keys:
                continue
            seen_label_keys.add(label_key)
            label = " / ".join(sorted(top_tags, key=str.casefold))
        else:
            label = f"Cluster {community_id}"
        communities.append(GraphCommunity(id=community_id, label=label, topTags=top_tags))

    return communities

