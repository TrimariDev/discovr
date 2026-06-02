from igraph import Graph

from .models import GraphAnalyzeRequest


def build_igraph(payload: GraphAnalyzeRequest) -> Graph:
    graph = Graph()
    node_ids = [node.id for node in payload.nodes]
    graph.add_vertices(node_ids)

    valid_ids = set(node_ids)
    edges = [(edge.source, edge.target) for edge in payload.edges if edge.source in valid_ids and edge.target in valid_ids]
    weights = [edge.weight for edge in payload.edges if edge.source in valid_ids and edge.target in valid_ids]

    if edges:
        graph.add_edges(edges)
        graph.es["weight"] = weights

    return graph

