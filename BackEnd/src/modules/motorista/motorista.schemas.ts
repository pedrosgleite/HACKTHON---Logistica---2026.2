import { z } from "zod";
import { posicaoSchema } from "../rastreio/rastreio.schemas";

export const tokenSchema = z.string().trim().min(1);
export const localizacaoMotoristaSchema = posicaoSchema;

export type LocalizacaoMotoristaInput = z.infer<typeof localizacaoMotoristaSchema>;
