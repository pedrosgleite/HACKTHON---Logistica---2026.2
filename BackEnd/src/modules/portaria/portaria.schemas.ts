import { z } from "zod";

const placaSchema = z.string().trim().min(7).max(8).transform((value) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase());

export const entradaSchema = z.object({
  placa: placaSchema,
  ticketId: z.string().trim().min(1).optional(),
});

export const carretaSchema = z.union([
  z.object({ placa: placaSchema, somenteCavalo: z.never().optional() }),
  z.object({ somenteCavalo: z.literal(true), placa: z.never().optional() }),
]).refine((value) => ("placa" in value && Boolean(value.placa)) || ("somenteCavalo" in value && value.somenteCavalo === true), {
  message: "Informe a placa da carreta ou somenteCavalo=true",
});

export const condutorSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  cpf: z.string().trim().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 11, "CPF deve conter 11 dígitos"),
  telefone: z.string().trim().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length >= 10 && value.length <= 13, "Telefone inválido"),
});

export const statusAcessoSchema = z.enum([
  "AGUARDANDO_DADOS",
  "EM_ANALISE",
  "LINK_ENVIADO",
  "LIBERADO",
  "SAIU",
  "BLOQUEADO",
]);

export type EntradaInput = z.infer<typeof entradaSchema>;
export type CarretaInput = z.infer<typeof carretaSchema>;
export type CondutorInput = z.infer<typeof condutorSchema>;
