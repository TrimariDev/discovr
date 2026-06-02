import cors from "cors";
import { config } from "dotenv";
import express, { type ErrorRequestHandler } from "express";
import { resolve } from "node:path";
import { artistsRouter } from "./routes/artists.js";
import { graphsRouter } from "./routes/graphs.js";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "discovr-api" });
});

app.use("/api/artists", artistsRouter);
app.use("/api/graphs", graphsRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected API error";
  response.status(500).json({
    error: {
      message
    }
  });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Discovr API listening on http://localhost:${port}`);
});
