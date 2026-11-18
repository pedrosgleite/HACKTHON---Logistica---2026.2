import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFoundHandler } from "./shared/errors";
import { openapi } from "./shared/swagger";
import { nfeRouter } from "./modules/nfe/nfe.routes";
import { portariaRouter } from "./modules/portaria/portaria.routes";
import { romaneiosRouter } from "./modules/romaneios/romaneios.routes";
import { entregasRouter } from "./modules/entregas/entregas.routes";
import { rastreioRouter, rastreioTicketsRouter } from "./modules/rastreio/rastreio.routes";
import { painelRouter, ticketsRouter } from "./modules/tickets/tickets.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/nfe", nfeRouter);
app.use("/tickets", rastreioTicketsRouter); // /tickets/:id/eta e /tickets/:id/posicoes
app.use("/tickets", ticketsRouter);
app.use("/rastreio", rastreioRouter);
app.use("/painel", painelRouter);
app.use("/romaneios", romaneiosRouter);
app.use("/entregas", entregasRouter);
app.use("/portaria", portariaRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, () => {
  console.log(`ARGOS API rodando em http://localhost:${PORT} (docs em /docs)`);
});
