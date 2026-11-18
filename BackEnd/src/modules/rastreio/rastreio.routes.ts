import { Router } from "express";
import { posicaoSchema } from "./rastreio.schemas";
import { etaDoTicket, posicoesDoTicket, receberPosicao } from "./rastreio.service";

/** Montado em /rastreio */
export const rastreioRouter = Router();
/** Montado em /tickets (rotas /tickets/:id/eta e /tickets/:id/posicoes) */
export const rastreioTicketsRouter = Router();

rastreioRouter.post("/posicao", async (req, res, next) => {
  try {
    res.status(201).json(await receberPosicao(posicaoSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

rastreioTicketsRouter.get("/:id/eta", async (req, res, next) => {
  try {
    res.json(await etaDoTicket(req.params.id));
  } catch (error) {
    next(error);
  }
});

rastreioTicketsRouter.get("/:id/posicoes", async (req, res, next) => {
  try {
    res.json(await posicoesDoTicket(req.params.id));
  } catch (error) {
    next(error);
  }
});
