import { z } from "zod";

const id = z.string().trim().min(1);

/** Cria a partir do ticket (todas as notas livres dele) ou de uma lista de notas do mesmo ticket. */
export const criarRomaneioSchema = z
  .object({
    ticketId: id.optional(),
    notaIds: z.array(id).min(1).optional(),
  })
  .refine((v) => v.ticketId || v.notaIds, { message: "Informe ticketId ou notaIds" });

export const adicionarNotasSchema = z.object({
  notaIds: z.array(id).min(1),
});

export const conferirSchema = z.object({
  itens: z
    .array(z.object({ notaFiscalId: id, volumes: z.number().int().nonnegative() }))
    .min(1),
  pesoConferido: z.number().nonnegative().optional(),
  aceitarDivergencia: z.boolean().default(false),
  observacao: z.string().trim().max(500).optional(),
});

export type CriarRomaneioInput = z.infer<typeof criarRomaneioSchema>;
export type AdicionarNotasInput = z.infer<typeof adicionarNotasSchema>;
export type ConferirInput = z.infer<typeof conferirSchema>;
