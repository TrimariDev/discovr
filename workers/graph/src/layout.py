from igraph import Graph


def _normalize_points(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if not points:
        return []

    if len(points) == 1:
        return [(0.0, 0.0)]

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    def normalize(value: float, minimum: float, maximum: float) -> float:
        if maximum == minimum:
            return 0.0
        return ((value - minimum) / (maximum - minimum)) * 2 - 1

    return [(normalize(point[0], min_x, max_x), normalize(point[1], min_y, max_y)) for point in points]


def normalized_layout(graph: Graph) -> list[tuple[float, float]]:
    if graph.vcount() == 0:
        return []

    if graph.vcount() == 1:
        return [(0.0, 0.0)]

    layout = graph.layout_fruchterman_reingold(weights="weight")
    return _normalize_points(list(layout))


def normalized_layout_from_initial(
    graph: Graph,
    initial: list[tuple[float, float]],
    seed_artist_id: str | None,
    niter: int = 120,
) -> list[tuple[float, float]]:
    if graph.vcount() == 0:
        return []

    if graph.vcount() == 1:
        return [(0.0, 0.0)]

    if len(initial) != graph.vcount():
        return normalized_layout(graph)

    layout = graph.layout_fruchterman_reingold(layout=initial, weights="weight", niter=niter)
    points = list(layout)

    if seed_artist_id and seed_artist_id in graph.vs["name"]:
        seed_index = graph.vs.find(name=seed_artist_id).index
        points[seed_index] = (0.0, 0.0)

    return _normalize_points(points)

