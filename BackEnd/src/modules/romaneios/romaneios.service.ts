import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { comCodigoUnico, proximoCodigoRomaneio } from "../../shared/codigos";
import { registrarEvento } from "../../shared/contratos";
import { STATUS_FINAIS } from "../tickets/tickets.transicoes";
import type { AdicionarNotasInput, ConferirInput, CriarRomaneioInput } from "./romaneios.schemas";

type Tx = Prisma.TransactionClient;

const incluirDetalhe = {
  ticket: { select: { id: true, codigo: true, status: true, frota: true, tipoPatio: true } },
  notas: {
    orderBy: { createdAt: "asc" },
    include: { destinatario: { select: { id: true, cnpj: true, razaoSocial: true, cidade: true, uf: true } } },
  },
  entregas: { orderBy: { sequencia: "asc" } },
  ocorrencias: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.RomaneioInclude;

async function carregar(db: Tx | typeof prisma, id: string) {
  const romaneio = await db.romaneio.findUnique({ where: { id }, include: incluirDetalhe });
  if (!romaneio) throw new AppError("Romaneio não encontrado", 404, { id });
  return romaneio;
}

/** Recalcula volumes e peso previstos a partir das notas do romaneio. */
async function recalcularTotais(tx: Tx, romaneioId: string) {
  const soma = await tx.notaFiscal.aggregate({ where: { romaneioId }, _sum: { volumes: true, peso: true } });
  await tx.romaneio.update({
    where: { id: romaneioId },
    data: { volumesPrevistos: soma._sum.volumes ?? 0, pesoPrevisto: soma._sum.peso ?? new Prisma.Decimal(0) },
  });
}

/** Valida que as notas existem, são do ticket e não estão em outro romaneio. */
async function validarNotas(tx: Tx, notaIds: string[], ticketId: string | null) {
  const unicos = [...new Set(notaIds)];
  const notas = await tx.notaFiscal.findMany({ where: { id: { in: unicos } }, select: { id: true, ticketId: true, romaneioId: true } });

  const faltando = unicos.filter((id) => !notas.some((n) => n.id === id));
  if (faltando.length) throw new AppError("Notas não encontradas", 404, { notaIds: faltando });

  const tickets = [...new Set(notas.map((n) => n.ticketId))];
  if (tickets.length !== 1 || tickets[0] === null) {
    throw new AppError("Todas as notas devem pertencer ao mesmo ticket", 422, { tickets });
  }
  if (ticketId && tickets[0] !== ticketId) {
    throw new AppError("As notas não pertencem a este ticket", 422, { ticketId, ticketDasNotas: tickets[0] });
  }

  const emOutro = notas.filter((n) => n.romaneioId);
  if (emOutro.length) {
    throw new AppError("Notas já estão em um romaneio", 409, emOutro.map((n) => ({ notaId: n.id, romaneioId: n.romaneioId })));
  }
  return { ticketId: tickets[0] as string, notaIds: unicos };
}

async function garantirTicketAberto(tx: Tx, ticketId: string) {
  const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
  if (!ticket) throw new AppError("Ticket não encontrado", 404, { ticketId });
  if (STATUS_FINAIS.includes(ticket.status)) {
    throw new AppError(`Ticket ${ticket.status} não aceita romaneio`, 422, { ticketId, status: ticket.status });
  }
}

export async function criarRomaneio(input: CriarRomaneioInput) {
  const id = await comCodigoUnico(() =>
    prisma.$transaction(async (tx) => {
      let ticketId: string;
      let notaIds: string[];

      if (input.notaIds) {
        ({ ticketId, notaIds } = await validarNotas(tx, input.notaIds, input.ticketId ?? null));
      } else {
        ticketId = input.ticketId!;
        await garantirTicketAberto(tx, ticketId);
        const livres = await tx.notaFiscal.findMany({ where: { ticketId, romaneioId: null }, select: { id: true } });
        if (!livres.length) throw new AppError("O ticket não tem notas fora de romaneio", 422, { ticketId });
        notaIds = livres.map((n) => n.id);
      }
      await garantirTicketAberto(tx, ticketId);

      const romaneio = await tx.romaneio.create({ data: { codigo: await proximoCodigoRomaneio(tx), ticketId } });
      await tx.notaFiscal.updateMany({ where: { id: { in: notaIds }, romaneioId: null }, data: { romaneioId: romaneio.id } });
      await recalcularTotais(tx, romaneio.id);
      await registrarEvento(ticketId, "ROMANEIO_CRIADO", `Romaneio ${romaneio.codigo} criado com ${notaIds.length} nota(s)`, {
        romaneioId: romaneio.id,
        notaIds,
      }, tx);
      return romaneio.id;
    }),
  );
  return carregar(prisma, id);
}

export async function adicionarNotas(id: string, input: AdicionarNotasInput) {
  await prisma.$transaction(async (tx) => {
    const romaneio = await carregar(tx, id);
    if (romaneio.status !== "EM_MONTAGEM") {
      throw new AppError("Só é possível adicionar notas a romaneio EM_MONTAGEM", 422, { status: romaneio.status });
    }
    const { notaIds } = await validarNotas(tx, input.notaIds, romaneio.ticketId);
    await tx.notaFiscal.updateMany({ where: { id: { in: notaIds }, romaneioId: null }, data: { romaneioId: id } });
    await recalcularTotais(tx, id);
    await registrarEvento(romaneio.ticketId, "ROMANEIO_NOTAS_ADICIONADAS", `${notaIds.length} nota(s) adicionada(s) ao ${romaneio.codigo}`, {
      romaneioId: id,
      notaIds,
    }, tx);
  });
  return carregar(prisma, id);
}

export async function conferirRomaneio(id: string, input: ConferirInput) {
  const romaneio = await carregar(prisma, id);
  if (romaneio.status !== "EM_MONTAGEM") {
    throw new AppError("Só é possível conferir romaneio EM_MONTAGEM", 422, { status: romaneio.status });
  }

  const informados = new Map<string, number>();
  for (const item of input.itens) {
    if (informados.has(item.notaFiscalId)) throw new AppError("Nota repetida na conferência", 422, { notaFiscalId: item.notaFiscalId });
    informados.set(item.notaFiscalId, item.volumes);
  }
  const estranhas = [...informados.keys()].filter((nid) => !romaneio.notas.some((n) => n.id === nid));
  if (estranhas.length) throw new AppError("Notas não pertencem a este romaneio", 422, { notaIds: estranhas });
  const semConferir = romaneio.notas.filter((n) => !informados.has(n.id)).map((n) => n.id);
  if (semConferir.length) throw new AppError("Informe os volumes de todas as notas do romaneio", 422, { faltando: semConferir });

  const divergencias = romaneio.notas
    .map((n) => ({ notaFiscalId: n.id, numero: n.numero, previstos: n.volumes, conferidos: informados.get(n.id)! }))
    .filter((d) => d.previstos !== d.conferidos);
  const volumesConferidos = [...informados.values()].reduce((s, v) => s + v, 0);

  const resultado = await prisma.$transaction(async (tx) => {
    let ocorrenciaId: string | undefined;
    if (divergencias.length) {
      const oc = await tx.ocorrencia.create({
        data: {
          ticketId: romaneio.ticketId,
          romaneioId: id,
          tipo: "DIVERGENCIA",
          descricao: `Divergência de volumes na conferência do ${romaneio.codigo}`,
          dados: { divergencias, aceita: input.aceitarDivergencia, observacao: input.observacao } as Prisma.InputJsonValue,
          resolvida: input.aceitarDivergencia,
        },
      });
      ocorrenciaId = oc.id;
    }

    const conferido = divergencias.length === 0 || input.aceitarDivergencia;
    if (conferido) {
      // divergências de tentativas anteriores deste romaneio deixam de estar pendentes
      await tx.ocorrencia.updateMany({
        where: { romaneioId: id, tipo: "DIVERGENCIA", resolvida: false },
        data: { resolvida: true },
      });
      await tx.romaneio.update({
        where: { id },
        data: {
          status: "CONFERIDO",
          volumesConferidos,
          pesoConferido: input.pesoConferido !== undefined ? new Prisma.Decimal(input.pesoConferido) : undefined,
        },
      });
    }
    await registrarEvento(
      romaneio.ticketId,
      conferido ? "ROMANEIO_CONFERIDO" : "ROMANEIO_DIVERGENCIA",
      conferido
        ? `${romaneio.codigo} conferido${divergencias.length ? " com divergência aceita" : ""}`
        : `${romaneio.codigo} com divergência — aguardando aceite ou nova conferência`,
      { romaneioId: id, volumesConferidos, divergencias, ocorrenciaId },
      tx,
    );
    return { conferido, ocorrenciaId };
  });

  if (!resultado.conferido) {
    throw new AppError("Divergência de volumes: envie aceitarDivergencia=true para conferir mesmo assim", 422, {
      divergencias,
      ocorrenciaId: resultado.ocorrenciaId,
    });
  }
  return carregar(prisma, id);
}

export async function liberarRomaneio(id: string) {
  await prisma.$transaction(async (tx) => {
    const romaneio = await carregar(tx, id);
    if (romaneio.status !== "CONFERIDO") {
      throw new AppError("Só é possível liberar romaneio CONFERIDO", 422, { status: romaneio.status });
    }
    if (!romaneio.notas.length) throw new AppError("Romaneio sem notas", 422, { id });

    // uma entrega por nota, na ordem das notas no romaneio
    await tx.entrega.createMany({
      data: romaneio.notas.map((n, i) => ({
        romaneioId: id,
        notaFiscalId: n.id,
        sequencia: i + 1,
        volumesPrevistos: n.volumes,
      })),
      skipDuplicates: true,
    });
    const r = await tx.romaneio.updateMany({ where: { id, status: "CONFERIDO" }, data: { status: "LIBERADO" } });
    if (r.count !== 1) throw new AppError("Romaneio mudou de status durante a liberação", 409, { id });

    await registrarEvento(romaneio.ticketId, "ROMANEIO_LIBERADO", `${romaneio.codigo} liberado com ${romaneio.notas.length} entrega(s)`, {
      romaneioId: id,
    }, tx);
  });
  return carregar(prisma, id);
}

export function detalharRomaneio(id: string) {
  return carregar(prisma, id);
}
