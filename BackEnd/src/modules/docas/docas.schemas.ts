import { z } from "zod";

export const alocarDocaSchema = z.object({
  ticketId: z.string().trim().min(1),
});

export const statusDocaSchema = z.object({
  status: z.enum(["LIVRE", "OCUPADA", "MANUTENCAO"]),
});
