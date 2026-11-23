import type { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { comCodigoUnico, proximoCodigoTicket } from "../../shared/codigos";
import { atualizarStatusTicket, registrarEvento } from "../../shared/contratos";
import { STATUS_FINAIS, proximosStatus } from "./tickets.transicoes";
import type { CancelarTicketInput, CriarTicketInput, ListarTicketsInput } from "./tickets.schemas";
import { liberarDocaDoTicket } from "../docas/docas.service";

export async function criarTicketManual(input: CriarTicketInput) {
  return comCodigoUnico(() => prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        codigo: await proximoCodigoTicket(tx),
        origem: "MANUAL",
        status: "CRIADO",
        tipoPatio: input.tipoPatio,
        frota: input.frota,
        observacoes: input.observacoes,
      },
    });
    await registrarEvento(ticket.id, "TICKET_CRIADO", "Ticket criado manualmente (solicitação de frete)", { origem: "MANUAL" }, tx);
    return ticket;
  }));
}

export async function listarTickets(filtros: ListarTicketsInput) {
  const where: Prisma.TicketWhereInput = {
    status: filtros.status,
    frota: filtros.frota,
    tipoPatio: filtros.tipoPatio,
  };
  if (filtros.busca) {
    const termo = filtros.busca.toUpperCase();
    where.OR = [
      { codigo: { contains: termo, mode: "insensitive" } },
      { notas: { some: { placa: termo.replace(/[^A-Z0-9]/g, "") } } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      notas: { select: { id: true, numero: true, placa: true, volumes: true } },
      _count: { select: { ocorrencias: { where: { resolvida: false } } } },
    },
  });

  return {
    total: tickets.length,
    tickets: tickets.map(({ _count, ...t }) => ({ ...t, ocorrenciasAbertas: _count.ocorrencias })),
  };
}

export async function detalharTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      eventos: { orderBy: { createdAt: "asc" } },
      notas: { include: { emitente: true, destinatario: true } },
      acessos: { include: { cavalo: true, carreta: true, motorista: true }, orderBy: { createdAt: "asc" } },
      analises: { orderBy: { createdAt: "asc" } },
      romaneios: { include: { entregas: { orderBy: { sequencia: "asc" } } } },
      alocacoes: { include: { doca: true }, orderBy: { entradaEm: "asc" } },
      filas: true,
      ocorrencias: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) throw new AppError("Ticket não encontrado", 404, { id });
  return { ...ticket, proximosStatus: proximosStatus(ticket.status) };
}

export async function cancelarTicket(id: string, input: CancelarTicketInput) {
  const atual = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!atual) throw new AppError("Ticket não encontrado", 404, { id });
  if (STATUS_FINAIS.includes(atual.status)) {
    throw new AppError(`Ticket já está ${atual.status} e não pode ser cancelado`, 422, { id, status: atual.status });
  }

  await prisma.$transaction(async (tx) => {
    await liberarDocaDoTicket(id, tx);
    await atualizarStatusTicket(id, "CANCELADO", tx, input.motivo ?? "cancelado pelo painel");
    // tira o ticket de qualquer fila de doca
    await tx.filaDoca.deleteMany({ where: { ticketId: id } });
  });
  return prisma.ticket.findUniqueOrThrow({ where: { id } });
}

export async function painel() {
  const [porStatus, docas, fila, ocorrencias] = await Promise.all([
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.doca.findMany({
      orderBy: { numero: "asc" },
      include: {
        alocacoes: {
          where: { saidaEm: null },
          include: { ticket: { select: { id: true, codigo: true, status: true, frota: true } } },
        },
      },
    }),
    prisma.filaDoca.findMany({
      orderBy: [{ tipo: "asc" }, { posicao: "asc" }],
      include: { ticket: { select: { id: true, codigo: true, status: true, frota: true } } },
    }),
    prisma.ocorrencia.findMany({
      where: { resolvida: false },
      orderBy: { createdAt: "desc" },
      include: { ticket: { select: { id: true, codigo: true, status: true } } },
    }),
  ]);

  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all]));

  return {
    tickets: { total: porStatus.reduce((s, x) => s + x._count._all, 0), porStatus: contagem },
    docas: docas.map((d) => ({
      id: d.id,
      numero: d.numero,
      tipo: d.tipo,
      status: d.status,
      ticket: d.alocacoes[0]?.ticket ?? null,
    })),
    fila: {
      COLETA: fila.filter((f) => f.tipo === "COLETA").map((f) => ({ posicao: f.posicao, ticket: f.ticket })),
      RECEBIMENTO: fila.filter((f) => f.tipo === "RECEBIMENTO").map((f) => ({ posicao: f.posicao, ticket: f.ticket })),
    },
    ocorrenciasAbertas: { total: ocorrencias.length, itens: ocorrencias },
  };
}
