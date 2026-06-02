from fastapi import FastAPI

from .build_graph import build_igraph
from .community import detect_communities, label_communities
from .layout import normalized_layout
from .models import GraphAnalyzeRequest, GraphAnalyzeResponse, GraphNodeAnalysis

app = FastAPI(title="Discovr Graph Worker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "discovr-graph-worker"}


@app.post("/graph/analyze", response_model=GraphAnalyzeResponse)
def analyze_graph(payload: GraphAnalyzeRequest) -> GraphAnalyzeResponse:
    graph = build_igraph(payload)
    memberships = detect_communities(graph)
    coordinates = normalized_layout(graph)
    degrees = graph.strength(weights="weight") if graph.vcount() else []

    analyzed_nodes: list[GraphNodeAnalysis] = []
    for index, node in enumerate(payload.nodes):
        is_seed = payload.seed_artist_id == node.id
        analyzed_nodes.append(
            GraphNodeAnalysis(
                id=node.id,
                community=memberships[index] if index < len(memberships) else 0,
                x=coordinates[index][0] if index < len(coordinates) else 0.0,
                y=coordinates[index][1] if index < len(coordinates) else 0.0,
                size=18 if is_seed else 8 + min(degrees[index] if index < len(degrees) else 0, 12),
            )
        )

    return GraphAnalyzeResponse(
        nodes=analyzed_nodes,
        communities=label_communities(payload.nodes, memberships),
    )

