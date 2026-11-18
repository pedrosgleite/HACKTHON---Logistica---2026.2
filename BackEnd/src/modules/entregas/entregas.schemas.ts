import { z } from "zod";

const texto = (max: number) => z.string().trim().min(1).max(max);

export const listarEntregasSchema = z
  .object({
    romaneioId: z.string().trim().min(1).optional(),
    ticketId: z.string().trim().min(1).optional(),
    status: z.enum(["PROGRAMADA", "EM_ROTA", "ENTREGUE", "PARCIAL", "RECUSADA", "DESTINATARIO_AUSENTE", "INSUCESSO"]).optional(),
  })
  .refine((v) => v.romaneioId || v.ticketId, { message: "Informe romaneioId ou ticketId" });

/**
 * Baixa da entrega (serve para o motorista pelo link ou para o painel).
 * - Sem `resultado`: entrega realizada → ENTREGUE, ou PARCIAL se volumes < previstos.
 *   Exige recebedor, documento, volumes e comprovante (POD).
 * - Com `resultado` (RECUSADA | DESTINATARIO_AUSENTE | INSUCESSO): entrega não realizada; `motivo` obrigatório.
 */
export const baixaSchema = z
  .object({
    resultado: z.enum(["RECUSADA", "DESTINATARIO_AUSENTE", "INSUCESSO"]).optional(),
    volumesEntregues: z.number().int().nonnegative().optional(),
    recebedorNome: texto(120).optional(),
    recebedorDoc: texto(30).optional(),
    comprovanteUrl: z.string().trim().url().max(1000).optional(),
    baixadaEm: z.coerce.date().optional(),
    motivo: texto(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.resultado) {
      if (!v.motivo) ctx.addIssue({ code: "custom", path: ["motivo"], message: "Informe o motivo da entrega não realizada" });
      return;
    }
    for (const campo of ["volumesEntregues", "recebedorNome", "recebedorDoc", "comprovanteUrl"] as const) {
      if (v[campo] === undefined) ctx.addIssue({ code: "custom", path: [campo], message: `${campo} é obrigatório na entrega realizada` });
    }
  });

export type ListarEntregasInput = z.infer<typeof listarEntregasSchema>;
export type BaixaInput = z.infer<typeof baixaSchema>;
