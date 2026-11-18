import type { TicketStatus } from "@prisma/client";

/**
 * Tabela de transições do ticket (PROJETO.md §6). Fonte única da verdade — usada pelo C5.
 *
 * Observações:
 * - NA_PORTARIA → BLOQUEADO / AGUARDANDO_MOTORISTA: a portaria roda a análise de risco
 *   de forma síncrona, então pode pular o EM_ANALISE_RISCO.
 * - EM_DESLOCAMENTO → AGUARDANDO_DOCA: entrada automática pela cerca eletrônica (frota própria).
 * - BLOQUEADO → EM_ANALISE_RISCO / AGUARDANDO_MOTORISTA: ADM corrigiu e pediu reanálise.
 * - Qualquer estado aberto → CANCELADO. ENCERRADO e CANCELADO são finais.
 */
export const TRANSICOES: Record<TicketStatus, TicketStatus[]> = {
  CRIADO: ["EM_DESLOCAMENTO", "NA_PORTARIA"],
  EM_DESLOCAMENTO: ["NA_PORTARIA", "AGUARDANDO_DOCA"],
  NA_PORTARIA: ["EM_ANALISE_RISCO", "BLOQUEADO", "AGUARDANDO_MOTORISTA", "AGUARDANDO_DOCA"],
  EM_ANALISE_RISCO: ["BLOQUEADO", "AGUARDANDO_MOTORISTA"],
  BLOQUEADO: ["EM_ANALISE_RISCO", "AGUARDANDO_MOTORISTA"],
  AGUARDANDO_MOTORISTA: ["AGUARDANDO_DOCA", "EM_DOCA"],
  AGUARDANDO_DOCA: ["EM_DOCA"],
  EM_DOCA: ["LIBERADO_SAIDA"],
  LIBERADO_SAIDA: ["EM_TRANSITO"],
  EM_TRANSITO: ["ENCERRADO"],
  ENCERRADO: [],
  CANCELADO: [],
};

export const STATUS_FINAIS: TicketStatus[] = ["ENCERRADO", "CANCELADO"];

export function transicaoPermitida(de: TicketStatus, para: TicketStatus): boolean {
  if (para === "CANCELADO") return !STATUS_FINAIS.includes(de);
  return TRANSICOES[de].includes(para);
}

export function proximosStatus(de: TicketStatus): TicketStatus[] {
  return STATUS_FINAIS.includes(de) ? [] : [...TRANSICOES[de], "CANCELADO"];
}
