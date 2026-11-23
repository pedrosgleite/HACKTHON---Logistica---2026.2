import { PrismaClient } from "@prisma/client";

/**
 * Transações interativas: o padrão do Prisma (5 s) é curto para o Neon na nuvem,
 * onde cada consulta leva centenas de ms e fluxos como a análise de risco fazem várias.
 */
export const prisma = new PrismaClient({
  transactionOptions: { timeout: 20_000, maxWait: 10_000 },
});
