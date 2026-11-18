import { Router } from "express";
import { baixaSchema, listarEntregasSchema } from "./entregas.schemas";
import { baixarEntrega, listarEntregas } from "./entregas.service";

export const entregasRouter = Router();

entregasRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listarEntregas(listarEntregasSchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

entregasRouter.post("/:id/baixa", async (req, res, next) => {
  try {
    res.json(await baixarEntrega(req.params.id, baixaSchema.parse(req.body ?? {})));
  } catch (error) {
    next(error);
  }
});
