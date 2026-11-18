import type { EntregaStatus } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { atualizarStatusTicket, registrarEvento } from "../../shared/contratos";
import type { BaixaInput, ListarEntregasInput } from "./entregas.schemas";

/** Resultados finais: com eles a entrega não muda mais. */
export const ENTREGA_FINAL: EntregaStatus[] = ["ENTREGUE", "PARCIAL", "RECUSADA", "DESTINATARIO_AUSENTE", "INSUCESSO"];

export async function listarEntregas(f: ListarEntregasInput) {
  const entregas = await prisma.entrega.findMany({
    where: {
      romaneioId: f.romaneioId,
      romaneio: f.ticketId ? { ticketId: f.ticketId } : undefined,
      status: f.status,
    },
    orderBy: [{ romaneioId: "asc" }, { sequencia: "asc" }],
    include: {
      notaFiscal: {
        select: { id: true, numero: true, chave: true, volumes: true, destinatario: { select: { cnpj: true, razaoSocial: true, cidade: true, uf: true } } },
      },
      romaneio: { select: { id: true, codigo: true, status: true, ticketId: true } },
    },
  });
  return { total: entregas.length, entregas };
}

export async function baixarEntrega(id: string, input: BaixaInput) {
  const entrega = await prisma.entrega.findUnique({
    where: { id },
    include: { romaneio: { select: { id: true, codigo: true, ticketId: true } }, notaFiscal: { select: { numero: true } } },
  });
  if (!entrega) throw new AppError("Entrega não encontrada", 404, { id });
  if (entrega.status !== "EM_ROTA") {
    throw new AppError(`Só é possível dar baixa em entrega EM_ROTA (atual: ${entrega.status})`, 422, { id, status: entrega.status });
  }

  const volumes = input.resultado ? (input.volumesEntregues ?? 0) : input.volumesEntregues!;
  if (volumes > entrega.volumesPrevistos) {
    throw new AppError("Volumes entregues maiores que os previstos", 422, { previstos: entrega.volumesPrevistos, entregues: volumes });
  }
  if (!input.resultado && volumes === 0) {
    throw new AppError("Entrega realizada com 0 volumes: use resultado RECUSADA, DESTINATARIO_AUSENTE ou INSUCESSO", 422);
  }

  const status: EntregaStatus = input.resultado ?? (volumes < entrega.volumesPrevistos ? "PARCIAL" : "ENTREGUE");
  const { ticketId, codigo } = entrega.romaneio;

  await prisma.$transaction(async (tx) => {
    // guarda de status: duas baixas simultâneas na mesma entrega → só uma passa
    const r = await tx.entrega.updateMany({
      where: { id, status: "EM_ROTA" },
      data: {
        status,
        volumesEntregues: volumes,
        recebedorNome: input.recebedorNome,
        recebedorDoc: input.recebedorDoc,
        comprovanteUrl: input.comprovanteUrl,
        baixadaEm: input.baixadaEm ?? new Date(),
      },
    });
    if (r.count !== 1) throw new AppError("Entrega já recebeu baixa", 409, { id });

    if (status === "PARCIAL") {
      await tx.ocorrencia.create({
        data: {
          ticketId,
          romaneioId: entrega.romaneioId,
          tipo: "DIVERGENCIA",
          descricao: `Entrega parcial da NF ${entrega.notaFiscal.numero}: ${volumes} de ${entrega.volumesPrevistos} volumes`,
          dados: { entregaId: id, previstos: entrega.volumesPrevistos, entregues: volumes },
        },
      });
    }

    await registrarEvento(
      ticketId,
      "ENTREGA_BAIXADA",
      `Entrega ${entrega.sequencia} (NF ${entrega.notaFiscal.numero}) do ${codigo}: ${status}`,
      { entregaId: id, status, volumesEntregues: volumes, previstos: entrega.volumesPrevistos, motivo: input.motivo },
      tx,
    );
  });

  // Fora da transação da baixa: assim, se duas últimas baixas chegarem juntas,
  // a segunda a terminar enxerga as duas gravadas e finaliza.
  const finalizacao = await verificarFinalizacao(entrega.romaneioId);

  const atualizada = await prisma.entrega.findUniqueOrThrow({ where: { id } });
  return { entrega: atualizada, ...finalizacao };
}

/** Romaneio com todas as entregas finais → FINALIZADO; ticket com todos os romaneios finalizados → ENCERRADO. */
export async function verificarFinalizacao(romaneioId: string) {
  return prisma.$transaction(async (tx) => {
    const romaneio = await tx.romaneio.findUniqueOrThrow({
      where: { id: romaneioId },
      include: { entregas: { select: { status: true } } },
    });

    let romaneioFinalizado = romaneio.status === "FINALIZADO";
    const todasFinais = romaneio.entregas.length > 0 && romaneio.entregas.every((e) => ENTREGA_FINAL.includes(e.status));

    if (!romaneioFinalizado && todasFinais) {
      const r = await tx.romaneio.updateMany({ where: { id: romaneioId, status: "LIBERADO" }, data: { status: "FINALIZADO" } });
      if (r.count === 1) {
        romaneioFinalizado = true;
        const resumo = romaneio.entregas.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {});
        await registrarEvento(romaneio.ticketId, "ROMANEIO_FINALIZADO", `${romaneio.codigo} finalizado`, { romaneioId, resumo }, tx);
      }
    }

    let ticketEncerrado = false;
    if (romaneioFinalizado) {
      const romaneios = await tx.romaneio.findMany({ where: { ticketId: romaneio.ticketId }, select: { status: true } });
      const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: romaneio.ticketId }, select: { status: true } });
      if (romaneios.every((r) => r.status === "FINALIZADO") && ticket.status === "EM_TRANSITO") {
        await atualizarStatusTicket(romaneio.ticketId, "ENCERRADO", tx, "todas as entregas concluídas");
        await registrarEvento(romaneio.ticketId, "TICKET_ENCERRADO", "Ticket encerrado: todos os romaneios finalizados", undefined, tx);
        ticketEncerrado = true;
      }
    }
    return { romaneioFinalizado, ticketEncerrado };
  });
}
