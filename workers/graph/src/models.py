from pydantic import BaseModel


class GraphNodeInput(BaseModel):
    id: str
    name: str
    tags: list[str] = []


class GraphEdgeInput(BaseModel):
    source: str
    target: str
    weight: float = 1.0


class GraphAnalyzeRequest(BaseModel):
    seed_artist_id: str | None = None
    nodes: list[GraphNodeInput]
    edges: list[GraphEdgeInput]


class GraphNodeAnalysis(BaseModel):
    id: str
    community: int
    x: float
    y: float
    size: float


class GraphCommunity(BaseModel):
    id: int
    label: str
    topTags: list[str]


class GraphAnalyzeResponse(BaseModel):
    nodes: list[GraphNodeAnalysis]
    communities: list[GraphCommunity]

