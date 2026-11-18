import { Router } from "express";
import { cancelarTicketSchema, criarTicketSchema, listarTicketsSchema } from "./tickets.schemas";
import { cancelarTicket, criarTicketManual, detalharTicket, listarTickets, painel } from "./tickets.service";

export const ticketsRouter = Router();
export const painelRouter = Router();

ticketsRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json(await criarTicketManual(criarTicketSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listarTickets(listarTicketsSchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await detalharTicket(req.params.id));
  } catch (error) {
    next(error);
  }
});

ticketsRouter.post("/:id/cancelar", async (req, res, next) => {
  try {
    res.json(await cancelarTicket(req.params.id, cancelarTicketSchema.parse(req.body ?? {})));
  } catch (error) {
    next(error);
  }
});

painelRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await painel());
  } catch (error) {
    next(error);
  }
});
