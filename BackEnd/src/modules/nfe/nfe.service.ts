import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { comCodigoUnico, proximoCodigoTicket, violouUnique } from "../../shared/codigos";
import { registrarEvento } from "../../shared/contratos";
import { parseNfeXml, type ParteNota } from "./nfe.parser";
import { triar } from "./nfe.triagem";
import type { IngestaoInput } from "./nfe.schemas";

const STATUS_FECHADOS: string[] = ["ENCERRADO", "CANCELADO"];

function cnpjDoCd(): string {
  const cnpj = (process.env.EMPRESA_CNPJ ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) throw new AppError("EMPRESA_CNPJ não configurado no .env", 500);
  return cnpj;
}

function upsertCliente(tx: Prisma.TransactionClient, p: ParteNota) {
  const dados = { razaoSocial: p.razaoSocial, nomeFantasia: p.nomeFantasia, cidade: p.cidade, uf: p.uf };
  return tx.cliente.upsert({ where: { cnpj: p.cnpj }, update: dados, create: { cnpj: p.cnpj, ...dados } });
}

export async function ingerirXml(input: IngestaoInput) {
  const nota = parseNfeXml(input.xml);

  const existente = await prisma.notaFiscal.findUnique({ where: { chave: nota.chave }, select: { id: true, ticketId: true } });
  if (existente) {
    throw new AppError("Nota já importada", 409, { chave: nota.chave, notaId: existente.id, ticketId: existente.ticketId });
  }

  const veiculo = nota.placa
    ? await prisma.veiculo.findUnique({ where: { placa: nota.placa }, select: { frota: true } })
    : null;

  const triagem = triar({
    cnpjCd: cnpjDoCd(),
    emitente: nota.emitente.cnpj,
    destinatario: nota.destinatario.cnpj,
    placa: nota.placa,
    placaEhPropria: veiculo?.frota === "PROPRIA",
  });

  if (input.ticketId) {
    const alvo = await prisma.ticket.findUnique({ where: { id: input.ticketId }, select: { status: true } });
    if (!alvo) throw new AppError("Ticket não encontrado", 404, { ticketId: input.ticketId });
    if (STATUS_FECHADOS.includes(alvo.status)) {
      throw new AppError("Ticket encerrado/cancelado não aceita notas", 422, { ticketId: input.ticketId, status: alvo.status });
    }
  }

  try {
    return await comCodigoUnico(() => prisma.$transaction(async (tx) => {
      const emitente = await upsertCliente(tx, nota.emitente);
      const destinatario = await upsertCliente(tx, nota.destinatario);

      const ticket = input.ticketId
        ? await tx.ticket.findUniqueOrThrow({ where: { id: input.ticketId } })
        : await tx.ticket.create({
            data: {
              codigo: await proximoCodigoTicket(tx),
              origem: "AUTOMATICO",
              status: "CRIADO",
              frota: triagem.frota,
              tipoPatio: triagem.tipoPatio,
              motivoTriagem: triagem.motivo,
            },
          });

      const notaFiscal = await tx.notaFiscal.create({
        data: {
          chave: nota.chave,
          numero: nota.numero,
          serie: nota.serie,
          volumes: nota.volumes,
          peso: new Prisma.Decimal(nota.peso),
          placa: nota.placa,
          cfop: nota.cfop,
          tipoPatio: triagem.tipoPatio,
          operacao: triagem.operacao,
          origemSistema: input.origemSistema,
          motivoTriagem: triagem.motivo,
          emitenteId: emitente.id,
          destinatarioId: destinatario.id,
          ticketId: ticket.id,
        },
      });

      if (input.ticketId) {
        await registrarEvento(ticket.id, "NOTA_ANEXADA", `NF ${nota.numero} anexada ao ticket`, { notaId: notaFiscal.id, chave: nota.chave }, tx);
      } else {
        await registrarEvento(
          ticket.id,
          "TICKET_CRIADO",
          `Ticket criado automaticamente pela NF ${nota.numero} (${input.origemSistema})`,
          { notaId: notaFiscal.id, chave: nota.chave, triagem },
          tx,
        );
      }

      return { nota: notaFiscal, ticket, triagem };
    }));
  } catch (e) {
    if (violouUnique(e, "chave")) {
      throw new AppError("Nota já importada", 409, { chave: nota.chave });
    }
    throw e;
  }
}

export async function detalharNota(id: string) {
  const nota = await prisma.notaFiscal.findUnique({
    where: { id },
    include: {
      emitente: true,
      destinatario: true,
      ticket: { select: { id: true, codigo: true, status: true, origem: true, frota: true, tipoPatio: true, motivoTriagem: true } },
    },
  });
  if (!nota) throw new AppError("Nota não encontrada", 404, { id });
  return nota;
}
