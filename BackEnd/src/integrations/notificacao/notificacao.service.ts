import type { CanalNotificacao } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";

interface NotificacaoSimuladaInput {
  ticketId?: string | null;
  acessoId?: string | null;
  canal: CanalNotificacao;
  destino: string;
  mensagem: string;
}

export async function enviarNotificacaoSimulada(
  input: NotificacaoSimuladaInput,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const notificacao = await db.notificacao.create({
    data: {
      ticketId: input.ticketId ?? null,
      acessoId: input.acessoId ?? null,
      canal: input.canal,
      destino: input.destino,
      mensagem: input.mensagem,
    },
  });
  console.info(`[NOTIFICACAO ${input.canal}] para ${input.destino}: ${input.mensagem}`);
  return notificacao;
}
