import { Prisma } from "@prisma/client";

/**
 * Repete `fn` quando o Postgres recusa uma transação por conflito de escrita/deadlock
 * (Prisma P2034 — comum em transações Serializable com pedidos simultâneos).
 * `fn` deve abrir a própria $transaction, para que cada tentativa comece do zero.
 */
export async function comRetryDeConflito<T>(fn: () => Promise<T>, tentativas = 10): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      // P2034 = conflito/deadlock; P2010 + 40001/40P01 = o mesmo erro vindo de $queryRaw
      const pgCode = (e as { meta?: { code?: string } })?.meta?.code;
      const conflito =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2034" || (e.code === "P2010" && (pgCode === "40001" || pgCode === "40P01")));
      if (!conflito || i >= tentativas) throw e;
      await new Promise((r) => setTimeout(r, Math.min(500, 20 * 2 ** i) * (0.5 + Math.random())));
    }
  }
}
