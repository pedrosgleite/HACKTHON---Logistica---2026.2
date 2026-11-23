import { Router } from "express";
import type { AcessoStatus } from "@prisma/client";
import { carretaSchema, condutorSchema, entradaSchema, statusAcessoSchema } from "./portaria.schemas";
import { informarCarreta, informarCondutor, listarAcessos, registrarEntrada, registrarSaidaPortaria } from "./portaria.service";

export const portariaRouter = Router();

portariaRouter.post("/entrada", async (req, res, next) => {
  try {
    const input = entradaSchema.parse(req.body);
    res.status(201).json(await registrarEntrada(input));
  } catch (error) {
    next(error);
  }
});

portariaRouter.patch("/:acessoId/carreta", async (req, res, next) => {
  try {
    const input = carretaSchema.parse(req.body);
    res.json(await informarCarreta(req.params.acessoId, input));
  } catch (error) {
    next(error);
  }
});

portariaRouter.patch("/:acessoId/condutor", async (req, res, next) => {
  try {
    const input = condutorSchema.parse(req.body);
    res.json(await informarCondutor(req.params.acessoId, input));
  } catch (error) {
    next(error);
  }
});

portariaRouter.post("/:acessoId/saida", async (req, res, next) => {
  try {
    res.json(await registrarSaidaPortaria(req.params.acessoId));
  } catch (error) {
    next(error);
  }
});

portariaRouter.get("/acessos", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string"
      ? statusAcessoSchema.parse(req.query.status)
      : undefined;
    res.json(await listarAcessos(status as AcessoStatus | undefined));
  } catch (error) {
    next(error);
  }
});
