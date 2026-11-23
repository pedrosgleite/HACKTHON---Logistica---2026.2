import { Router } from "express";
import { localizacaoMotoristaSchema, tokenSchema } from "./motorista.schemas";
import {
  confirmarLinkMotorista,
  listarNotificacoes,
  obterDadosLinkMotorista,
  registrarLocalizacaoMotorista,
} from "./motorista.service";

export const motoristaRouter = Router();
export const notificacoesRouter = Router();

motoristaRouter.get("/link/:token", async (req, res, next) => {
  try {
    res.json(await obterDadosLinkMotorista(tokenSchema.parse(req.params.token)));
  } catch (error) {
    next(error);
  }
});

motoristaRouter.post("/link/:token/confirmar", async (req, res, next) => {
  try {
    res.json(await confirmarLinkMotorista(tokenSchema.parse(req.params.token)));
  } catch (error) {
    next(error);
  }
});

motoristaRouter.post("/link/:token/localizacao", async (req, res, next) => {
  try {
    const token = tokenSchema.parse(req.params.token);
    const input = localizacaoMotoristaSchema.parse(req.body);
    res.status(201).json(await registrarLocalizacaoMotorista(token, input));
  } catch (error) {
    next(error);
  }
});

notificacoesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listarNotificacoes());
  } catch (error) {
    next(error);
  }
});
