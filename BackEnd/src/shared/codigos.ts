import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/** Próximo código legível do ticket: TK-2026-00001 (PROJETO.md §8). */
export async function proximoCodigoTicket(db: Db = prisma): Promise<string> {
  const prefixo = `TK-${new Date().getFullYear()}-`;
  const ultimo = await db.ticket.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const seq = ultimo ? Number(ultimo.codigo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(seq).padStart(5, "0")}`;
}

/** Próximo código legível do romaneio: ROM-2026-00001 (PROJETO.md §8). */
export async function proximoCodigoRomaneio(db: Db = prisma): Promise<string> {
  const prefixo = `ROM-${new Date().getFullYear()}-`;
  const ultimo = await db.romaneio.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const seq = ultimo ? Number(ultimo.codigo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(seq).padStart(5, "0")}`;
}

/** true se o erro é violação de unique no campo informado (ex.: "codigo", "chave"). */
export function violouUnique(e: unknown, campo: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const alvo = (e.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(alvo) ? alvo.includes(campo) : typeof alvo === "string" && alvo.includes(campo);
}

/**
 * Roda `fn` (normalmente uma $transaction que gera código sequencial) e repete
 * se dois pedidos simultâneos pegarem o mesmo código.
 */
export async function comCodigoUnico<T>(fn: () => Promise<T>, campo = "codigo", tentativas = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tentativas || !violouUnique(e, campo)) throw e;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 80));
    }
  }
}
