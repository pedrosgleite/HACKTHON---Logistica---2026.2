import type { Prisma, TicketStatus } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { alocarDoca, atualizarStatusTicket, enviarLinkMotorista, registrarEvento } from "../../shared/contratos";
import { registrarSaida } from "../../shared/saida";
import { STATUS_FINAIS } from "../tickets/tickets.transicoes";
import { configRastreio } from "./rastreio.config";
import { atrasoMinutos, calcularEta, detectarCerca, haversineKm } from "./rastreio.geo";
import type { PosicaoInput } from "./rastreio.schemas";

/** Status em que a entrada pela cerca faz sentido (veículo ainda chegando ao CD). */
const PODE_ENTRAR: TicketStatus[] = ["EM_DESLOCAMENTO", "NA_PORTARIA"];
const arred = (n: number, casas = 3) => Math.round(n * 10 ** casas) / 10 ** casas;

/** Ticket aberto mais recente ligado à placa (pela nota ou por um acesso do veículo). */
async function ticketDaPlaca(placa: string, veiculoId: string) {
  return prisma.ticket.findFirst({
    where: {
      status: { notIn: STATUS_FINAIS },
      OR: [
        { notas: { some: { placa } } },
        { acessos: { some: { OR: [{ cavaloId: veiculoId }, { carretaId: veiculoId }] } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function receberPosicao(input: PosicaoInput) {
  const veiculo = await prisma.veiculo.findUnique({ where: { placa: input.placa } });
  if (!veiculo) throw new AppError("Veículo não cadastrado", 404, { placa: input.placa });

  const ticket = await ticketDaPlaca(input.placa, veiculo.id);
  if (!ticket) throw new AppError("Nenhum ticket aberto para esta placa", 404, { placa: input.placa });

  const cfg = configRastreio();
  const anterior = await prisma.posicaoVeiculo.findFirst({ where: { ticketId: ticket.id }, orderBy: { createdAt: "desc" } });
  const agora = new Date();

  // Em viagem: só guarda o trajeto (monitoramento); ETA até o CD não se aplica.
  if (ticket.status === "EM_TRANSITO") {
    const p = await prisma.posicaoVeiculo.create({
      data: { ticketId: ticket.id, veiculoId: veiculo.id, latitude: input.lat, longitude: input.lng, velocidade: input.velocidade },
    });
    return { posicaoId: p.id, ticket: { id: ticket.id, codigo: ticket.codigo, status: ticket.status }, monitoramento: "VIAGEM" };
  }

  const distanciaKm = arred(haversineKm({ lat: input.lat, lng: input.lng }, cfg.cd));
  const { etaMinutos, velocidadeUsada } = calcularEta(distanciaKm, input.velocidade, cfg.velocidadePadraoKmh);
  const cerca = veiculo.frota === "PROPRIA" ? detectarCerca(anterior?.distanciaKm ?? null, distanciaKm, cfg.raioCercaKm) : null;

  let atraso: number | null = null;
  if (anterior?.etaMinutos != null) {
    atraso = atrasoMinutos({ em: anterior.createdAt, etaMinutos: anterior.etaMinutos }, { em: agora, etaMinutos });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let status = ticket.status;
    if (status === "CRIADO") {
      await atualizarStatusTicket(ticket.id, "EM_DESLOCAMENTO", tx, "primeira posição do rastreador");
      status = "EM_DESLOCAMENTO";
    }

    const posicao = await tx.posicaoVeiculo.create({
      data: {
        ticketId: ticket.id,
        veiculoId: veiculo.id,
        latitude: input.lat,
        longitude: input.lng,
        velocidade: input.velocidade,
        distanciaKm,
        etaMinutos,
        createdAt: agora,
      },
    });

    let ocorrenciaAtraso: string | undefined;
    if (atraso !== null && atraso > cfg.limiteAtrasoMin) {
      const oc = await tx.ocorrencia.create({
        data: {
          ticketId: ticket.id,
          tipo: "ATRASO",
          descricao: `ETA atrasou ${atraso} min (limite ${cfg.limiteAtrasoMin} min)`,
          dados: { atrasoMin: atraso, etaAnterior: anterior!.etaMinutos, etaAtual: etaMinutos, posicaoId: posicao.id },
        },
      });
      ocorrenciaAtraso = oc.id;
      await registrarEvento(ticket.id, "ATRASO_DETECTADO", `Previsão de chegada atrasou ${atraso} min`, { ocorrenciaId: oc.id, atrasoMin: atraso }, tx);
    }

    let entrada: { acessoId: string } | undefined;
    if (cerca === "ENTRADA" && PODE_ENTRAR.includes(status)) {
      entrada = await entradaPelaCerca(tx, ticket.id, veiculo.id);
      status = "AGUARDANDO_DOCA";
    }

    return { posicao, status, ocorrenciaAtraso, entrada };
  });

  // Contratos do Dev B ficam fora da transação (C1 e C3).
  let cercaInfo: Record<string, unknown> | null = cerca ? { evento: cerca } : null;
  if (resultado.entrada) {
    cercaInfo = { evento: "ENTRADA", ...(await aposEntrada(ticket.id, resultado.entrada.acessoId)) };
  } else if (cerca === "ENTRADA") {
    cercaInfo = { evento: "ENTRADA", ignorada: true, motivo: `ticket em ${resultado.status}` };
  } else if (cerca === "SAIDA") {
    cercaInfo = { evento: "SAIDA", ...(await saidaPelaCerca(ticket.id)) };
  }

  const atual = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { id: true, codigo: true, status: true } });
  return {
    posicaoId: resultado.posicao.id,
    ticket: atual,
    distanciaKm,
    etaMinutos,
    velocidadeUsada,
    previsaoChegada: new Date(agora.getTime() + etaMinutos * 60_000),
    atrasoMin: atraso,
    ocorrenciaAtrasoId: resultado.ocorrenciaAtraso ?? null,
    cerca: cercaInfo,
  };
}

/** Entrada automática (frota própria): acesso LIBERADO + ticket AGUARDANDO_DOCA. */
async function entradaPelaCerca(tx: Prisma.TransactionClient, ticketId: string, veiculoId: string) {
  const agora = new Date();
  const aberto = await tx.acessoPortaria.findFirst({ where: { ticketId, cavaloId: veiculoId, saidaEm: null } });
  const acesso = aberto
    ? await tx.acessoPortaria.update({ where: { id: aberto.id }, data: { status: "LIBERADO", entradaEm: aberto.entradaEm ?? agora } })
    : await tx.acessoPortaria.create({ data: { ticketId, cavaloId: veiculoId, status: "LIBERADO", entradaEm: agora } });

  await atualizarStatusTicket(ticketId, "AGUARDANDO_DOCA", tx, "entrada automática pela cerca eletrônica");
  await registrarEvento(ticketId, "ENTRADA_CERCA", "Entrada automática pela cerca eletrônica (frota própria)", { acessoId: acesso.id }, tx);
  return { acessoId: acesso.id };
}

/** Depois da entrada: C1 (doca) e C3 (link do motorista). Falhas viram evento, não derrubam a posição. */
async function aposEntrada(ticketId: string, acessoId: string) {
  const out: Record<string, unknown> = { acessoId };
  try {
    out.doca = await alocarDoca(ticketId);
  } catch (e) {
    out.doca = { erro: (e as Error).message };
    await registrarEvento(ticketId, "FALHA_ALOCAR_DOCA", "Falha ao alocar doca após entrada pela cerca", { erro: (e as Error).message });
  }

  const acesso = await prisma.acessoPortaria.findUnique({ where: { id: acessoId }, include: { motorista: true } });
  const telefone = acesso?.motorista?.telefone;
  if (!telefone) {
    out.linkMotorista = { enviado: false, motivo: "acesso sem motorista/telefone" };
    await registrarEvento(ticketId, "LINK_MOTORISTA_PENDENTE", "Link do motorista não enviado: acesso sem motorista/telefone", { acessoId });
  } else {
    try {
      out.linkMotorista = { enviado: true, ...(await enviarLinkMotorista(ticketId, telefone)) };
    } catch (e) {
      out.linkMotorista = { enviado: false, erro: (e as Error).message };
    }
  }
  return out;
}

/** Saída pela cerca: usa a mesma registrarSaida() da portaria (SPEC-10). Recusa vira ocorrência. */
async function saidaPelaCerca(ticketId: string) {
  try {
    return { registrada: true, ...(await prisma.$transaction((tx) => registrarSaida(ticketId, "CERCA", tx))) };
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    const oc = await prisma.ocorrencia.create({
      data: { ticketId, tipo: "OUTRO", descricao: `Veículo saiu da cerca sem liberação: ${e.message}`, dados: { detalhes: e.detalhes ?? null } as Prisma.InputJsonValue },
    });
    await registrarEvento(ticketId, "SAIDA_NAO_AUTORIZADA", "Veículo saiu da cerca sem liberação", { ocorrenciaId: oc.id, motivo: e.message });
    return { registrada: false, motivo: e.message, ocorrenciaId: oc.id };
  }
}

export async function etaDoTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, codigo: true, status: true } });
  if (!ticket) throw new AppError("Ticket não encontrado", 404, { ticketId });

  const ultima = await prisma.posicaoVeiculo.findFirst({
    where: { ticketId, etaMinutos: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!ultima) return { ticket, disponivel: false, motivo: "sem posições com ETA" };

  return {
    ticket,
    disponivel: true,
    distanciaKm: ultima.distanciaKm,
    etaMinutos: ultima.etaMinutos,
    previsaoChegada: new Date(ultima.createdAt.getTime() + ultima.etaMinutos! * 60_000),
    ultimaPosicao: { lat: ultima.latitude, lng: ultima.longitude, velocidade: ultima.velocidade, em: ultima.createdAt },
    dentroDaCerca: (ultima.distanciaKm ?? Infinity) <= configRastreio().raioCercaKm,
  };
}

export async function posicoesDoTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, codigo: true, status: true } });
  if (!ticket) throw new AppError("Ticket não encontrado", 404, { ticketId });
  const posicoes = await prisma.posicaoVeiculo.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: { id: true, latitude: true, longitude: true, velocidade: true, distanciaKm: true, etaMinutos: true, createdAt: true },
  });
  return { ticket, total: posicoes.length, posicoes };
}
