import { Router } from "express";
import type { ApiErrorResponse, ExplainEdgeResponse } from "@discovr/contracts";
import { explainEdge } from "../services/edgeExplain.js";

export const edgesRouter = Router();

edgesRouter.get("/explain", (request, response) => {
  const source = String(request.query.source ?? "").trim();
  const target = String(request.query.target ?? "").trim();
  const seed = String(request.query.seed ?? "").trim() || undefined;

  if (!source || !target) {
    const payload: ApiErrorResponse = {
      error: { message: "Query parameters source and target are required" }
    };
    response.status(400).json(payload);
    return;
  }

  const payload = explainEdge({ source, target, seed });

  if (!payload) {
    const notFound: ApiErrorResponse = {
      error: {
        message:
          "No explanation available. Load a graph for these artists first, or provide seed when both artists are in that graph."
      }
    };
    response.status(404).json(notFound);
    return;
  }

  const body: ExplainEdgeResponse = payload;
  response.json(body);
});
