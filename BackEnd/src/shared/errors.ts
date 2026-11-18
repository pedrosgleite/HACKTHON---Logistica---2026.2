import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

/** Erro de aplicação com status HTTP. Formato de resposta: { erro, detalhes } (PROJETO.md §8). */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ erro: "Rota não encontrada", detalhes: { metodo: req.method, caminho: req.originalUrl } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ erro: err.message, detalhes: err.detalhes ?? null });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({ erro: "Dados inválidos", detalhes: err.issues });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ erro: "JSON inválido", detalhes: null });
    return;
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor", detalhes: null });
};
