import { randomBytes } from "node:crypto";
import type { CanalNotificacao } from "@prisma/client";
import { enviarNotificacaoSimulada } from "../../integrations/notificacao/notificacao.service";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { alocarDoca, registrarEvento } from "../../shared/contratos";
import type { LocalizacaoMotoristaInput } from "./motorista.schemas";
import { receberPosicao } from "../rastreio/rastreio.service";

const TOKEN_VALIDADE_MS = 12 * 60 * 60 * 1000;

function urlBase() {
  return (process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT || 3333}`).replace(/\/+$/, "");
}

async function buscarAcessoPorToken(token: string, recusarTokenUsado = false) {
  const acesso = await prisma.acessoPortaria.findUnique({
    where: { token },
    include: {
      cavalo: true,
      carreta: true,
      motorista: true,
      ticket: {
        include: {
          notas: { select: { numero: true, volumes: true, peso: true, placa: true } },
        },
      },
    },
  });
  if (!acesso) throw new AppError("Link do motorista não encontrado", 404);
  if (!acesso.tokenValidade || acesso.tokenValidade <= new Date()) {
    throw new AppError("Link do motorista expirado", 410, { tokenValidade: acesso.tokenValidade });
  }
  if (recusarTokenUsado && acesso.tokenUsado) {
    throw new AppError("Link do motorista já utilizado", 409);
  }
  return acesso;
}

export async function enviarLinkMotorista(ticketId: string, telefone: string): Promise<{ token: string }> {
  const acesso = await prisma.acessoPortaria.findFirst({
    where: { ticketId, saidaEm: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, tokenValidade: true, tokenUsado: true },
  });
  if (!acesso) throw new AppError("Nenhum acesso aberto para o ticket", 404, { ticketId });

  let token: string;
  let validade: Date;
  if (acesso.token && acesso.tokenValidade && acesso.tokenValidade > new Date() && !acesso.tokenUsado) {
    token = acesso.token;
    validade = acesso.tokenValidade;
  } else {
    token = randomBytes(32).toString("hex");
    validade = new Date(Date.now() + TOKEN_VALIDADE_MS);
    await prisma.acessoPortaria.update({
      where: { id: acesso.id },
      data: { token, tokenValidade: validade, tokenUsado: false },
    });
  }

  const link = `${urlBase()}/motorista/link/${token}`;
  const mensagem = `ARGOS: acesse ${link} para consultar os dados da viagem e confirmar o recebimento. Válido até ${validade.toISOString()}.`;
  const canais: CanalNotificacao[] = ["SMS", "WHATSAPP"];
  for (const canal of canais) {
    await enviarNotificacaoSimulada({
      ticketId,
      acessoId: acesso.id,
      canal,
      destino: telefone,
      mensagem,
    });
  }

  await registrarEvento(ticketId, "LINK_MOTORISTA_ENVIADO", "Link do motorista enviado por SMS e WhatsApp", {
    acessoId: acesso.id,
    tokenValidade: validade.toISOString(),
    canais,
  });
  return { token };
}

export async function obterDadosLinkMotorista(token: string) {
  const acesso = await buscarAcessoPorToken(token, true);
  return {
    acesso: { id: acesso.id, status: acesso.status, tokenValidade: acesso.tokenValidade },
    ticket: {
      id: acesso.ticket.id,
      codigo: acesso.ticket.codigo,
      status: acesso.ticket.status,
      tipoPatio: acesso.ticket.tipoPatio,
      notas: acesso.ticket.notas,
    },
    veiculos: {
      cavalo: { placa: acesso.cavalo.placa, tipo: acesso.cavalo.tipo },
      carreta: acesso.carreta ? { placa: acesso.carreta.placa, tipo: acesso.carreta.tipo } : null,
    },
    motorista: acesso.motorista ? { nome: acesso.motorista.nome } : null,
  };
}

export async function confirmarLinkMotorista(token: string) {
  const acesso = await buscarAcessoPorToken(token);
  const tokenValidade = acesso.tokenValidade;
  if (!tokenValidade) throw new AppError("Link do motorista expirado", 410);
  if (acesso.tokenUsado) throw new AppError("Link do motorista já utilizado", 409);
  if (["CANCELADO", "ENCERRADO"].includes(acesso.ticket.status)) {
    throw new AppError("Ticket não aceita confirmação neste status", 409, { status: acesso.ticket.status });
  }

  const alocacao = await alocarDoca(acesso.ticketId);
  const consumido = await prisma.acessoPortaria.updateMany({
    where: { id: acesso.id, tokenUsado: false, tokenValidade: { gt: new Date() } },
    data: { tokenUsado: true, status: "LIBERADO" },
  });
  if (consumido.count === 0) {
    throw new AppError("Link do motorista já utilizado ou expirado", tokenValidade <= new Date() ? 410 : 409);
  }

  await registrarEvento(acesso.ticketId, "MOTORISTA_CONFIRMOU_LINK", "Motorista confirmou o link e recebeu a alocação", {
    acessoId: acesso.id,
    ...alocacao,
  });
  return { ticketId: acesso.ticketId, ...alocacao };
}

export async function registrarLocalizacaoMotorista(token: string, input: LocalizacaoMotoristaInput) {
  const acesso = await buscarAcessoPorToken(token);
  if (acesso.cavalo.frota !== "TERCEIRA") {
    throw new AppError("Localização pelo link disponível apenas para frota terceira", 422);
  }
  if (acesso.ticket.status !== "EM_TRANSITO") {
    throw new AppError("Localização pelo link permitida somente durante a viagem", 422, {
      status: acesso.ticket.status,
    });
  }

  const placa = input.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const placasAcesso = [acesso.cavalo.placa, acesso.carreta?.placa]
    .filter((valor): valor is string => Boolean(valor))
    .map((valor) => valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
  if (!placasAcesso.includes(placa)) {
    throw new AppError("A placa informada não pertence ao acesso vinculado", 409, { placa });
  }

  return receberPosicao(input, acesso.ticketId);
}

export async function listarNotificacoes() {
  return prisma.notificacao.findMany({
    orderBy: { enviadaEm: "desc" },
    include: {
      ticket: { select: { id: true, codigo: true } },
      acesso: { select: { id: true } },
    },
  });
}
