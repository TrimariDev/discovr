import type { ApiErrorResponse, HealthCheckResponse } from "@discovr/contracts";
import cors from "cors";
import { config } from "dotenv";
import express, { type ErrorRequestHandler } from "express";
import { resolve } from "node:path";
import { artistsRouter } from "./routes/artists.js";
import { edgesRouter } from "./routes/edges.js";
import { graphsRouter } from "./routes/graphs.js";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  const payload: HealthCheckResponse = { status: "ok", service: "discovr-api" };
  response.json(payload);
});

app.use("/api/artists", artistsRouter);
app.use("/api/graphs", graphsRouter);
app.use("/api/edges", edgesRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected API error";
  const payload: ApiErrorResponse = { error: { message } };
  response.status(500).json(payload);
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Discovr API listening on http://localhost:${port}`);
});
