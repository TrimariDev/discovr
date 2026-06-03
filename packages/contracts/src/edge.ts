/** GET /api/edges/explain?source=&target=&seed= */
export type ExplainEdgeResponse = {
  score: number;
  reasons: string[];
};
