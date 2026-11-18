import { z } from "zod";

export const posicaoSchema = z.object({
  placa: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .refine((v) => v.length === 7, "Placa deve ter 7 caracteres"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  velocidade: z.number().min(0).max(200).optional(), // km/h
});

export type PosicaoInput = z.infer<typeof posicaoSchema>;
