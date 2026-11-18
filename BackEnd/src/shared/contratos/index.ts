/**
 * Contratos entre os dois devs (ROADMAP.md §4).
 * São os ÚNICOS pontos em que um módulo chama o outro. Hoje são STUBS (sempre sucesso);
 * quem implementa substitui o corpo da função mantendo a assinatura. Não mude a assinatura sem avisar.
 *
 * | ID | Implementa | Usa   | Spec que substitui o stub |
 * | C1 | B          | A     | SPEC-09                   |
 * | C2 | A          | B     | SPEC-03                   |
 * | C3 | B          | A     | SPEC-08                   |
 * | C4 | A          | A + B | SPEC-02                   |
 * | C5 | A          | A + B | SPEC-02                   |
 */

import type { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { AppError } from "../errors";
import { proximosStatus, transicaoPermitida } from "../../modules/tickets/tickets.transicoes";

export interface ResultadoAlocacaoDoca {
  docaId?: string;
  numeroDoca?: number;
  posicaoFila?: number;
}

/** C1 — Aloca uma doca para o ticket ou o coloca na fila. Chamado pela cerca eletrônica (frota própria). */
export async function alocarDoca(ticketId: string): Promise<ResultadoAlocacaoDoca> {
  console.warn(`[STUB C1] alocarDoca(${ticketId})`);
  return { posicaoFila: 1 };
}

/** C2 — true se todos os romaneios do ticket estão LIBERADO ou FINALIZADO. */
export async function romaneioLiberado(ticketId: string): Promise<boolean> {
  console.warn(`[STUB C2] romaneioLiberado(${ticketId})`);
  return true;
}

/** C3 — Envia (simulado) o link do motorista e devolve o token de acesso. */
export async function enviarLinkMotorista(ticketId: string, telefone: string): Promise<{ token: string }> {
  console.warn(`[STUB C3] enviarLinkMotorista(${ticketId}, ${telefone})`);
  return { token: `stub-${ticketId}` };
}

/**
 * C4 — Grava um EventoTicket na linha do tempo. IMPLEMENTADO (Dev A).
 * `db` é opcional: passe o `tx` quando estiver dentro de uma transação.
 */
export async function registrarEvento(
  ticketId: string,
  tipo: string,
  descricao: string,
  dados?: Record<string, unknown>,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await db.eventoTicket.create({
    data: { ticketId, tipo, descricao, dados: dados as Prisma.InputJsonValue | undefined },
  });
}

/**
 * C5 — Muda o status do ticket validando a tabela de transições
 * (src/modules/tickets/tickets.transicoes.ts). IMPLEMENTADO (Dev A).
 * - 404 se o ticket não existe; 422 se a transição não é permitida.
 * - Mesmo status = nada muda (idempotente).
 * - Grava o evento STATUS_ALTERADO na linha do tempo.
 * `db` é opcional: passe o `tx` quando estiver dentro de uma transação.
 */
export async function atualizarStatusTicket(
  ticketId: string,
  novoStatus: TicketStatus,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  motivo?: string,
): Promise<{ de: TicketStatus; para: TicketStatus }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
  if (!ticket) throw new AppError("Ticket não encontrado", 404, { ticketId });

  const de = ticket.status;
  if (de === novoStatus) return { de, para: novoStatus };

  if (!transicaoPermitida(de, novoStatus)) {
    throw new AppError(`Transição de status inválida: ${de} → ${novoStatus}`, 422, {
      de,
      para: novoStatus,
      permitidos: proximosStatus(de),
    });
  }

  await db.ticket.update({ where: { id: ticketId }, data: { status: novoStatus } });
  await registrarEvento(ticketId, "STATUS_ALTERADO", `${de} → ${novoStatus}${motivo ? ` (${motivo})` : ""}`, { de, para: novoStatus, motivo }, db);
  return { de, para: novoStatus };
}
