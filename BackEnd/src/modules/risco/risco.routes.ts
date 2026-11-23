import { Router } from "express";
import { analisarAcesso, historicoRisco } from "./risco.service";

export const riscoRouter = Router();

riscoRouter.post("/acessos/:acessoId/analisar", async (req, res, next) => {
  try {
    res.json(await analisarAcesso(req.params.acessoId));
  } catch (error) {
    next(error);
  }
});

riscoRouter.get("/acessos/:acessoId", async (req, res, next) => {
  try {
    res.json(await historicoRisco(req.params.acessoId));
  } catch (error) {
    next(error);
  }
});
