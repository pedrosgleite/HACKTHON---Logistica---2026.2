import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "CRIADO",
  "EM_DESLOCAMENTO",
  "NA_PORTARIA",
  "EM_ANALISE_RISCO",
  "BLOQUEADO",
  "AGUARDANDO_MOTORISTA",
  "AGUARDANDO_DOCA",
  "EM_DOCA",
  "LIBERADO_SAIDA",
  "EM_TRANSITO",
  "ENCERRADO",
  "CANCELADO",
]);
export const frotaSchema = z.enum(["PROPRIA", "TERCEIRA"]);
export const tipoPatioSchema = z.enum(["COLETA", "RECEBIMENTO"]);

/** Ticket manual = solicitação de frete feita pelo colaborador logístico. */
export const criarTicketSchema = z.object({
  tipoPatio: tipoPatioSchema,
  frota: frotaSchema.optional(),
  observacoes: z.string().trim().max(1000).optional(),
});

export const listarTicketsSchema = z.object({
  status: ticketStatusSchema.optional(),
  frota: frotaSchema.optional(),
  tipoPatio: tipoPatioSchema.optional(),
  busca: z.string().trim().min(1).optional(), // código do ticket ou placa da nota
});

export const cancelarTicketSchema = z.object({
  motivo: z.string().trim().min(3).max(500).optional(),
});

export type CriarTicketInput = z.infer<typeof criarTicketSchema>;
export type ListarTicketsInput = z.infer<typeof listarTicketsSchema>;
export type CancelarTicketInput = z.infer<typeof cancelarTicketSchema>;
