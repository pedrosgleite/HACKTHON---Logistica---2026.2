import { Router } from "express";
import { adicionarNotasSchema, conferirSchema, criarRomaneioSchema } from "./romaneios.schemas";
import { adicionarNotas, conferirRomaneio, criarRomaneio, detalharRomaneio, liberarRomaneio } from "./romaneios.service";

export const romaneiosRouter = Router();

romaneiosRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json(await criarRomaneio(criarRomaneioSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

romaneiosRouter.post("/:id/notas", async (req, res, next) => {
  try {
    res.json(await adicionarNotas(req.params.id, adicionarNotasSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

romaneiosRouter.post("/:id/conferir", async (req, res, next) => {
  try {
    res.json(await conferirRomaneio(req.params.id, conferirSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

romaneiosRouter.post("/:id/liberar", async (req, res, next) => {
  try {
    res.json(await liberarRomaneio(req.params.id));
  } catch (error) {
    next(error);
  }
});

romaneiosRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await detalharRomaneio(req.params.id));
  } catch (error) {
    next(error);
  }
});
