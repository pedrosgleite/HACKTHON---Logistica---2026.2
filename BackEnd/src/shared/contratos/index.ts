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

/** C4 — Grava um EventoTicket na linha do tempo. */
export async function registrarEvento(
  ticketId: string,
  tipo: string,
  descricao: string,
  dados?: Record<string, unknown>,
): Promise<void> {
  console.warn(`[STUB C4] registrarEvento(${ticketId}, ${tipo}, ${descricao})`, dados ?? "");
}

/**
 * C5 — Muda o status do ticket validando a tabela de transições.
 * `novoStatus` é string até o enum de status existir no schema; troque pelo tipo do Prisma depois.
 */
export async function atualizarStatusTicket(ticketId: string, novoStatus: string): Promise<void> {
  console.warn(`[STUB C5] atualizarStatusTicket(${ticketId}, ${novoStatus})`);
}
