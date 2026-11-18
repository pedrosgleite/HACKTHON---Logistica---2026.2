import { z } from "zod";

export const origemSistemaSchema = z.enum(["SAP", "TOTVS"]);

/** Corpo JSON: { xml, origemSistema, ticketId? }. Para XML cru, os campos vêm na query. */
export const ingestaoSchema = z.object({
  xml: z.string().min(1, "xml obrigatório"),
  origemSistema: origemSistemaSchema,
  ticketId: z.string().trim().min(1).optional(),
});

export type IngestaoInput = z.infer<typeof ingestaoSchema>;
