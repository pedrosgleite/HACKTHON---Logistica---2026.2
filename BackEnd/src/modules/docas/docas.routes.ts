import { Router } from "express";
import { alocarDocaSchema, statusDocaSchema } from "./docas.schemas";
import {
  atualizarStatusDoca,
  alocarDocaParaTicket,
  liberarDoca,
  listarDocas,
  listarFilaDoca,
} from "./docas.service";

export const docasRouter = Router();

docasRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listarDocas());
  } catch (error) {
    next(error);
  }
});

docasRouter.post("/alocar", async (req, res, next) => {
  try {
    const input = alocarDocaSchema.parse(req.body);
    res.json(await alocarDocaParaTicket(input.ticketId));
  } catch (error) {
    next(error);
  }
});

docasRouter.post("/:id/liberar", async (req, res, next) => {
  try {
    res.json(await liberarDoca(req.params.id));
  } catch (error) {
    next(error);
  }
});

docasRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const input = statusDocaSchema.parse(req.body);
    res.json(await atualizarStatusDoca(req.params.id, input.status));
  } catch (error) {
    next(error);
  }
});

docasRouter.get("/fila", async (_req, res, next) => {
  try {
    res.json(await listarFilaDoca());
  } catch (error) {
    next(error);
  }
});
