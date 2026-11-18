import type { Prisma } from "@prisma/client";
import { AppError } from "./errors";
import { prisma } from "./prisma";
import { atualizarStatusTicket, registrarEvento, romaneioLiberado } from "./contratos";

/**
 * ⚠️ VERSÃO PROVISÓRIA da `registrarSaida()` da SPEC-10 (dono: Dev B).
 * Criada pelo Dev A para a saída pela cerca (SPEC-05) funcionar antes da SPEC-10.
 * Dev B: assuma este arquivo (ou substitua o corpo) e use a MESMA função na portaria,
 * como pede a SPEC-10 — a cerca já chama `registrarSaida(ticketId, "CERCA", tx)`.
 *
 * Regras (SPEC-10):
 * - Exige C2 (romaneio liberado); senão 422.
 * - Exige ticket LIBERADO_SAIDA (doca liberada) — validado pelo C5.
 * - Acesso aberto → SAIU; ticket → EM_TRANSITO; entregas PROGRAMADA → EM_ROTA.
 * - Eventos de início do monitoramento da viagem e do risco em rota.
 */
export async function registrarSaida(
  ticketId: string,
  origem: "PORTARIA" | "CERCA",
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (!(await romaneioLiberado(ticketId, db))) {
    throw new AppError("Saída recusada: romaneio do ticket não está liberado", 422, { ticketId });
  }

  await atualizarStatusTicket(ticketId, "EM_TRANSITO", db, `saída pela ${origem.toLowerCase()}`);

  const agora = new Date();
  await db.acessoPortaria.updateMany({ where: { ticketId, saidaEm: null }, data: { status: "SAIU", saidaEm: agora } });
  const entregas = await db.entrega.updateMany({
    where: { romaneio: { ticketId, status: "LIBERADO" }, status: "PROGRAMADA" },
    data: { status: "EM_ROTA" },
  });

  await registrarEvento(ticketId, "SAIDA_REGISTRADA", `Saída registrada pela ${origem.toLowerCase()}`, {
    origem,
    entregasEmRota: entregas.count,
  }, db);
  await registrarEvento(ticketId, "MONITORAMENTO_VIAGEM_INICIADO", "Início do monitoramento da viagem", { origem }, db);
  await registrarEvento(ticketId, "MONITORAMENTO_RISCO_INICIADO", "Início do monitoramento de risco em rota", { origem }, db);

  return { entregasEmRota: entregas.count, saidaEm: agora };
}
