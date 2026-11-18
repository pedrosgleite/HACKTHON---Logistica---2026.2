import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFoundHandler } from "./shared/errors";
import { openapi } from "./shared/swagger";
import { portariaRouter } from "./modules/portaria/portaria.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/portaria", portariaRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, () => {
  console.log(`ARGOS API rodando em http://localhost:${PORT} (docs em /docs)`);
});
