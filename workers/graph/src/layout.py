from igraph import Graph


def normalized_layout(graph: Graph) -> list[tuple[float, float]]:
    if graph.vcount() == 0:
        return []

    if graph.vcount() == 1:
        return [(0.0, 0.0)]

    layout = graph.layout_fruchterman_reingold(weights="weight")
    xs = [point[0] for point in layout]
    ys = [point[1] for point in layout]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    def normalize(value: float, minimum: float, maximum: float) -> float:
        if maximum == minimum:
            return 0.0
        return ((value - minimum) / (maximum - minimum)) * 2 - 1

    return [(normalize(point[0], min_x, max_x), normalize(point[1], min_y, max_y)) for point in layout]

