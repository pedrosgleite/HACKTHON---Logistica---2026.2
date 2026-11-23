import type { Prisma } from "@prisma/client";
import { analisarRiscoSimulado } from "../../integrations/risco/risco.service";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/errors";
import { enviarLinkMotorista, atualizarStatusTicket, registrarEvento } from "../../shared/contratos";

const normalizarPlaca = (placa: string) => placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export async function analisarAcesso(acessoId: string) {
  const acesso = await prisma.acessoPortaria.findUnique({
    where: { id: acessoId },
    include: {
      cavalo: true,
      carreta: true,
      motorista: true,
      ticket: { include: { notas: { select: { placa: true } } } },
    },
  });

  if (!acesso) throw new AppError("Acesso de portaria não encontrado", 404);
  if (acesso.status === "SAIU") {
    throw new AppError("Não é possível analisar um acesso que já saiu", 422, { status: acesso.status });
  }
  if (!acesso.motoristaId || !acesso.motorista) {
    throw new AppError("Informe o condutor antes de analisar o acesso", 422, { acessoId });
  }

  const resultado = analisarRiscoSimulado({
    cavaloRestrito: acesso.cavalo.restricao,
    cavaloMotivo: acesso.cavalo.motivoRestricao,
    carretaRestrita: acesso.carreta?.restricao ?? false,
    carretaMotivo: acesso.carreta?.motivoRestricao,
    motoristaRestrito: acesso.motorista.restricao,
    motoristaMotivo: acesso.motorista.motivoRestricao,
    cnhValidade: acesso.motorista.cnhValidade,
    placaNota: acesso.ticket.notas.map((nota) => nota.placa).find(Boolean) ?? null,
    placaPortaria: normalizarPlaca(acesso.cavalo.placa),
  });

  await prisma.$transaction(async (tx) => {
    await tx.acessoPortaria.update({
      where: { id: acessoId },
      data: { status: "EM_ANALISE" },
    });

    if (acesso.ticket.status === "NA_PORTARIA" || acesso.ticket.status === "BLOQUEADO") {
      await atualizarStatusTicket(acesso.ticketId, "EM_ANALISE_RISCO", tx, "Análise de risco iniciada");
    }

    await tx.analiseRisco.create({
      data: {
        ticketId: acesso.ticketId,
        acessoId,
        status: resultado.status,
        score: resultado.score,
        motivos: resultado.motivos,
      },
    });

    if (resultado.status === "APROVADO") {
      await tx.acessoPortaria.update({
        where: { id: acessoId },
        data: { status: "LINK_ENVIADO" },
      });
      await atualizarStatusTicket(acesso.ticketId, "AGUARDANDO_MOTORISTA", tx, "Risco aprovado");
      await tx.ocorrencia.updateMany({
        where: { ticketId: acesso.ticketId, tipo: "RISCO", resolvida: false },
        data: { resolvida: true },
      });
      await registrarEvento(acesso.ticketId, "RISCO_APROVADO", "Análise de risco aprovada", {
        acessoId,
        score: resultado.score,
        motivos: resultado.motivos,
      }, tx);

      await enviarLinkMotorista(acesso.ticketId, acesso.motorista.telefone);
    } else {
      await tx.acessoPortaria.update({
        where: { id: acessoId },
        data: { status: "BLOQUEADO" },
      });
      await atualizarStatusTicket(acesso.ticketId, "BLOQUEADO", tx, "Risco reprovado");
      await tx.ocorrencia.create({
        data: {
          ticketId: acesso.ticketId,
          tipo: "RISCO",
          descricao: "Entrada bloqueada pela análise simulada de risco",
          dados: { acessoId, score: resultado.score, motivos: resultado.motivos } as Prisma.InputJsonObject,
        },
      });
      await tx.notificacao.create({
        data: {
          ticketId: acesso.ticketId,
          acessoId,
          canal: "SMS",
          destino: "ADM",
          mensagem: `Entrada bloqueada por risco: acesso ${acessoId}, score ${resultado.score}.`,
        },
      });
      await registrarEvento(acesso.ticketId, "RISCO_REPROVADO", "Análise de risco reprovada", {
        acessoId,
        score: resultado.score,
        motivos: resultado.motivos,
      }, tx);
    }
  });

  const acessoAtualizado = await prisma.acessoPortaria.findUnique({
    where: { id: acessoId },
    include: { ticket: true },
  });

  return {
    acessoId,
    status: resultado.status,
    ticketStatus: acessoAtualizado?.ticket.status,
    analiseRisco: resultado,
    proximoPasso: resultado.status === "APROVADO"
      ? "AGUARDANDO_LINK_DO_MOTORISTA"
      : "AGUARDANDO_CORRECAO_DO_ADM",
  };
}

export async function historicoRisco(acessoId: string) {
  const acesso = await prisma.acessoPortaria.findUnique({
    where: { id: acessoId },
    include: {
      ticket: { select: { id: true, codigo: true, status: true } },
      cavalo: { select: { id: true, placa: true, restricao: true } },
      carreta: { select: { id: true, placa: true, restricao: true } },
      motorista: { select: { id: true, nome: true, cpf: true, telefone: true } },
      analises: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!acesso) throw new AppError("Acesso de portaria não encontrado", 404);

  return {
    acesso: {
      id: acesso.id,
      status: acesso.status,
      ticket: acesso.ticket,
      cavalo: acesso.cavalo,
      carreta: acesso.carreta,
      motorista: acesso.motorista,
    },
    historico: acesso.analises.map((analise) => ({
      id: analise.id,
      status: analise.status,
      score: analise.score,
      motivos: analise.motivos,
      createdAt: analise.createdAt,
    })),
  };
}
