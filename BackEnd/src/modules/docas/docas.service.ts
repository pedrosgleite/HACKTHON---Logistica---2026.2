import type { DocaStatus, DocaTipo, Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import {
  atualizarStatusTicket,
  romaneioLiberado,
  registrarEvento,
  type ResultadoAlocacaoDoca,
} from "../../shared/contratos";

async function compactarFila(tx: Prisma.TransactionClient, tipo: DocaTipo) {
  const itens = await tx.filaDoca.findMany({
    where: { tipo },
    orderBy: [{ posicao: "asc" }, { createdAt: "asc" }],
  });
  for (let i = 0; i < itens.length; i++) {
    if (itens[i].posicao !== i + 1) {
      await tx.filaDoca.update({
        where: { id: itens[i].id },
        data: { posicao: i + 1 },
      });
    }
  }
}

async function alocarProximoDaFila(tx: Prisma.TransactionClient, tipo: DocaTipo) {
  const livre = await tx.$queryRaw<Array<{ id: string; numero: number }>>`
    SELECT id, numero
    FROM "Doca"
    WHERE tipo = CAST(${tipo} AS "DocaTipo")
      AND status = CAST('LIVRE' AS "DocaStatus")
    ORDER BY numero
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;
  if (livre.length === 0) return null;

  const primeiro = await tx.filaDoca.findFirst({
    where: { tipo },
    orderBy: [{ posicao: "asc" }, { createdAt: "asc" }],
  });
  if (!primeiro) return null;

  await tx.doca.update({ where: { id: livre[0].id }, data: { status: "OCUPADA" } });
  await tx.alocacaoDoca.create({
    data: { ticketId: primeiro.ticketId, docaId: livre[0].id },
  });
  await tx.filaDoca.delete({ where: { id: primeiro.id } });
  await atualizarStatusTicket(primeiro.ticketId, "EM_DOCA", tx, `doca ${livre[0].numero} liberada`);
  await compactarFila(tx, tipo);
  await registrarEvento(
    primeiro.ticketId,
    "DOCA_ALOCADA",
    `Doca ${livre[0].numero} alocada automaticamente`,
    { docaId: livre[0].id, numeroDoca: livre[0].numero, automatico: true },
    tx,
  );
  return { ticketId: primeiro.ticketId, docaId: livre[0].id, numeroDoca: livre[0].numero };
}

export async function listarDocas() {
  return prisma.doca.findMany({
    orderBy: { numero: "asc" },
    include: {
      alocacoes: {
        where: { saidaEm: null },
        include: { ticket: { select: { id: true, codigo: true, status: true } } },
      },
    },
  });
}

export async function listarFilaDoca() {
  return prisma.filaDoca.findMany({
    orderBy: [{ tipo: "asc" }, { posicao: "asc" }],
    include: { ticket: { select: { id: true, codigo: true, status: true, tipoPatio: true } } },
  });
}

export async function alocarDocaParaTicket(ticketId: string): Promise<ResultadoAlocacaoDoca> {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new AppError("Ticket não encontrado", 404, { ticketId });
    if (!ticket.tipoPatio) throw new AppError("Ticket não possui tipo de pátio", 422, { ticketId });

    const aberta = await tx.alocacaoDoca.findFirst({
      where: { ticketId, saidaEm: null },
      include: { doca: true },
    });
    if (aberta) {
      await tx.filaDoca.deleteMany({ where: { ticketId } });
      return { docaId: aberta.docaId, numeroDoca: aberta.doca.numero };
    }

    const jaNaFila = await tx.filaDoca.findFirst({ where: { ticketId } });
    if (jaNaFila) return { posicaoFila: jaNaFila.posicao };

    const livre = await tx.$queryRaw<Array<{ id: string; numero: number }>>`
      SELECT id, numero
      FROM "Doca"
      WHERE tipo = CAST(${ticket.tipoPatio} AS "DocaTipo")
        AND status = CAST('LIVRE' AS "DocaStatus")
      ORDER BY numero
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (livre.length > 0) {
      await tx.doca.update({ where: { id: livre[0].id }, data: { status: "OCUPADA" } });
      await tx.alocacaoDoca.create({ data: { ticketId, docaId: livre[0].id } });

      if (ticket.status === "NA_PORTARIA" || ticket.status === "AGUARDANDO_MOTORISTA") {
        await atualizarStatusTicket(ticketId, "AGUARDANDO_DOCA", tx, "doca disponível");
      }
      if (ticket.status !== "EM_DOCA") {
        await atualizarStatusTicket(ticketId, "EM_DOCA", tx, `doca ${livre[0].numero} alocada`);
      }
      await registrarEvento(
        ticketId,
        "DOCA_ALOCADA",
        `Doca ${livre[0].numero} alocada`,
        { docaId: livre[0].id, numeroDoca: livre[0].numero },
        tx,
      );
      return { docaId: livre[0].id, numeroDoca: livre[0].numero };
    }

    const ultima = await tx.filaDoca.findFirst({
      where: { tipo: ticket.tipoPatio },
      orderBy: { posicao: "desc" },
      select: { posicao: true },
    });
    const posicao = (ultima?.posicao ?? 0) + 1;
    await tx.filaDoca.create({
      data: { ticketId, tipo: ticket.tipoPatio, posicao },
    });
    if (ticket.status !== "AGUARDANDO_DOCA") {
      await atualizarStatusTicket(ticketId, "AGUARDANDO_DOCA", tx, "nenhuma doca disponível");
    }
    await registrarEvento(
      ticketId,
      "ENTROU_FILA_DOCA",
      `Ticket entrou na fila da doca ${ticket.tipoPatio} na posição ${posicao}`,
      { tipo: ticket.tipoPatio, posicao },
      tx,
    );
    return { posicaoFila: posicao };
  }, { isolationLevel: "Serializable" });
}

export async function liberarDoca(docaId: string) {
  return prisma.$transaction(async (tx) => {
    const doca = await tx.doca.findUnique({
      where: { id: docaId },
      include: { alocacoes: { where: { saidaEm: null }, include: { ticket: true } } },
    });
    if (!doca) throw new AppError("Doca não encontrada", 404, { docaId });
    if (doca.alocacoes.length === 0) throw new AppError("Doca não possui veículo alocado", 422, { docaId });

    const alocacao = doca.alocacoes[0];
    if (!(await romaneioLiberado(alocacao.ticketId, tx))) {
      throw new AppError("Romaneio não liberado para o ticket", 422, { ticketId: alocacao.ticketId });
    }

    await tx.alocacaoDoca.update({
      where: { id: alocacao.id },
      data: { saidaEm: new Date() },
    });
    await tx.doca.update({ where: { id: docaId }, data: { status: "LIVRE" } });
    await atualizarStatusTicket(alocacao.ticketId, "LIBERADO_SAIDA", tx, `doca ${doca.numero} liberada`);
    await registrarEvento(
      alocacao.ticketId,
      "DOCA_LIBERADA",
      `Doca ${doca.numero} liberada`,
      { docaId, numeroDoca: doca.numero },
      tx,
    );

    const proximo = await alocarProximoDaFila(tx, doca.tipo);
    return {
      doca: { id: doca.id, numero: doca.numero, tipo: doca.tipo, status: "LIVRE" },
      ticketLiberado: { id: alocacao.ticketId, codigo: alocacao.ticket.codigo },
      proximo,
    };
  }, { isolationLevel: "Serializable" });
}

export async function atualizarStatusDoca(docaId: string, status: DocaStatus) {
  return prisma.$transaction(async (tx) => {
    const doca = await tx.doca.findUnique({
      where: { id: docaId },
      include: { alocacoes: { where: { saidaEm: null } } },
    });
    if (!doca) throw new AppError("Doca não encontrada", 404, { docaId });

    if (status === "MANUTENCAO" && doca.alocacoes.length > 0) {
      throw new AppError("Doca ocupada não pode entrar em manutenção", 422, { docaId });
    }
    if (status === "OCUPADA" && doca.alocacoes.length === 0) {
      throw new AppError("Doca ocupada exige uma alocação aberta", 422, { docaId });
    }
    if (status === "LIVRE" && doca.alocacoes.length > 0) {
      throw new AppError("Doca com veículo alocado não pode ficar LIVRE", 422, { docaId });
    }

    return tx.doca.update({ where: { id: docaId }, data: { status } });
  });
}

export async function liberarDocaDoTicket(ticketId: string, tx: Prisma.TransactionClient) {
  const alocacao = await tx.alocacaoDoca.findFirst({
    where: { ticketId, saidaEm: null },
    include: { doca: true },
  });
  if (!alocacao) return null;

  await tx.alocacaoDoca.update({
    where: { id: alocacao.id },
    data: { saidaEm: new Date() },
  });
  await tx.doca.update({ where: { id: alocacao.docaId }, data: { status: "LIVRE" } });
  await compactarFila(tx, alocacao.doca.tipo);
  await registrarEvento(
    ticketId,
    "DOCA_LIBERADA",
    `Doca ${alocacao.doca.numero} liberada pelo cancelamento`,
    { docaId: alocacao.docaId, numeroDoca: alocacao.doca.numero, motivo: "CANCELAMENTO" },
    tx,
  );
  return alocarProximoDaFila(tx, alocacao.doca.tipo);
}
