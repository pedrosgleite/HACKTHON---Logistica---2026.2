import type { AcessoStatus, TicketStatus } from "@prisma/client";
import { AppError } from "../../shared/errors";
import { prisma } from "../../shared/prisma";
import { analisarRiscoSimulado } from "../../integrations/risco/risco.service";
import type { CarretaInput, CondutorInput, EntradaInput } from "./portaria.schemas";

const statusTicketAberto: TicketStatus[] = [
  "CRIADO",
  "EM_DESLOCAMENTO",
  "NA_PORTARIA",
  "EM_ANALISE_RISCO",
  "BLOQUEADO",
  "AGUARDANDO_MOTORISTA",
  "AGUARDANDO_DOCA",
  "EM_DOCA",
];

const normalizarPlaca = (placa: string) => placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

async function encontrarTicketAbertoPelaPlaca(placa: string) {
  const tickets = await prisma.ticket.findMany({
    where: { status: { in: statusTicketAberto } },
    include: { notas: { select: { placa: true } } },
  });

  return tickets.find((ticket) => ticket.notas.some((nota) => nota.placa && normalizarPlaca(nota.placa) === placa));
}

async function registrarEvento(ticketId: string, tipo: string, descricao: string, dados?: Record<string, unknown>) {
  await prisma.eventoTicket.create({
    data: { ticketId, tipo, descricao, dados: dados as object | undefined },
  });
}

export async function registrarEntrada(input: EntradaInput) {
  const placa = normalizarPlaca(input.placa);

  let ticket = input.ticketId
    ? await prisma.ticket.findUnique({ where: { id: input.ticketId }, include: { notas: { select: { placa: true } } } })
    : await encontrarTicketAbertoPelaPlaca(placa);

  if (ticket && !statusTicketAberto.includes(ticket.status)) {
    ticket = null;
  }

  if (!ticket) {
    await prisma.notificacao.create({
      data: {
        canal: "SMS",
        destino: "ADM",
        mensagem: `Bloqueio de entrada: placa ${placa} não está vinculada a nenhum ticket aberto.`,
      },
    });
    throw new AppError("Placa não encontrada em ticket aberto", 409, { placa, bloqueado: true });
  }

  if (input.ticketId) {
    const placasNota = ticket.notas.map((nota) => nota.placa).filter((notaPlaca): notaPlaca is string => Boolean(notaPlaca));
    if (placasNota.length > 0 && !placasNota.some((notaPlaca) => normalizarPlaca(notaPlaca) === placa)) {
      throw new AppError("A placa não corresponde ao ticket informado", 409, { placa, ticketId: ticket.id });
    }
  }

  let cavalo = await prisma.veiculo.findUnique({ where: { placa } });
  const frota = cavalo?.frota ?? ticket.frota ?? "TERCEIRA";

  if (cavalo && cavalo.tipo !== "CAVALO") {
    throw new AppError("A placa informada não é um cavalo mecânico", 409, { placa });
  }

  if (!cavalo) {
    cavalo = await prisma.veiculo.create({
      data: { placa, tipo: "CAVALO", frota },
    });
  }

  const acessoExistente = await prisma.acessoPortaria.findFirst({
    where: { ticketId: ticket.id, cavaloId: cavalo.id, saidaEm: null },
  });

  if (acessoExistente) {
    return {
      acessoId: acessoExistente.id,
      ticket: { id: ticket.id, codigo: ticket.codigo, status: ticket.status },
      cavalo: { id: cavalo.id, placa: cavalo.placa, tipo: cavalo.tipo, frota: cavalo.frota },
      status: acessoExistente.status,
      proximoPasso: acessoExistente.status === "AGUARDANDO_DADOS"
        ? (acessoExistente.somenteCavalo || acessoExistente.carretaId ? "INFORMAR_CONDUTOR" : "INFORMAR_CARRETA_OU_SOMENTE_CAVALO")
        : cavalo.frota === "PROPRIA" ? "ENTRADA_REGISTRADA_AGUARDANDO_CERCA" : "ANALISE_DE_RISCO",
    };
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const statusAcesso: AcessoStatus = cavalo!.frota === "PROPRIA" ? "LIBERADO" : "AGUARDANDO_DADOS";

    const acesso = await tx.acessoPortaria.create({
      data: {
        ticketId: ticket!.id,
        cavaloId: cavalo!.id,
        status: statusAcesso,
        entradaEm: new Date(),
      },
    });

    await tx.ticket.update({
      where: { id: ticket!.id },
      data: {
        status: "NA_PORTARIA",
        frota: cavalo!.frota,
      },
    });

    await tx.eventoTicket.create({
      data: {
        ticketId: ticket!.id,
        tipo: "ENTRADA_PORTARIA",
        descricao: cavalo!.frota === "PROPRIA" ? "Entrada própria registrada na portaria" : "Entrada terceira registrada na portaria",
        dados: { placa, acessoId: acesso.id, frota: cavalo!.frota } as object,
      },
    });

    return acesso;
  });

  return {
    acessoId: resultado.id,
    ticket: { id: ticket.id, codigo: ticket.codigo, status: "NA_PORTARIA" },
    cavalo: { id: cavalo.id, placa: cavalo.placa, tipo: cavalo.tipo, frota: cavalo.frota },
    status: resultado.status,
    proximoPasso: cavalo.frota === "PROPRIA"
      ? "ENTRADA_REGISTRADA_AGUARDANDO_CERCA"
      : "INFORMAR_CARRETA_OU_SOMENTE_CAVALO",
  };
}

export async function informarCarreta(acessoId: string, input: CarretaInput) {
  const acesso = await prisma.acessoPortaria.findUnique({
    where: { id: acessoId },
    include: { cavalo: true, ticket: true },
  });

  if (!acesso) throw new AppError("Acesso de portaria não encontrado", 404);
  if (acesso.status === "SAIU" || acesso.status === "BLOQUEADO") {
    throw new AppError("O acesso não pode receber dados neste status", 422, { status: acesso.status });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    if ("somenteCavalo" in input && input.somenteCavalo) {
      const atualizado = await tx.acessoPortaria.update({
        where: { id: acessoId },
        data: { somenteCavalo: true, carretaId: null },
        include: { cavalo: true, carreta: true },
      });
      await tx.eventoTicket.create({
        data: { ticketId: acesso.ticketId, tipo: "SOMENTE_CAVALO", descricao: "Entrada registrada somente com cavalo mecânico", dados: { acessoId } as object },
      });
      return atualizado;
    }

    const placa = normalizarPlaca(input.placa);
    let carreta = await tx.veiculo.findUnique({ where: { placa } });
    if (carreta && carreta.tipo !== "CARRETA") {
      throw new AppError("A placa informada não é uma carreta", 409, { placa });
    }
    if (!carreta) {
      carreta = await tx.veiculo.create({ data: { placa, tipo: "CARRETA", frota: acesso.cavalo.frota } });
    }

    const atualizado = await tx.acessoPortaria.update({
      where: { id: acessoId },
      data: { carretaId: carreta.id, somenteCavalo: false },
      include: { cavalo: true, carreta: true },
    });
    await tx.eventoTicket.create({
      data: { ticketId: acesso.ticketId, tipo: "CARRETA_INFORMADA", descricao: "Carreta informada na portaria", dados: { acessoId, placa } as object },
    });
    return atualizado;
  });

  return {
    acessoId: resultado.id,
    status: resultado.status,
    carreta: resultado.carreta ? { id: resultado.carreta.id, placa: resultado.carreta.placa } : null,
    somenteCavalo: resultado.somenteCavalo,
    proximoPasso: "INFORMAR_CONDUTOR",
  };
}

export async function informarCondutor(acessoId: string, input: CondutorInput) {
  const acesso = await prisma.acessoPortaria.findUnique({
    where: { id: acessoId },
    include: {
      cavalo: true,
      carreta: true,
      ticket: { include: { notas: { select: { placa: true } } } },
    },
  });

  if (!acesso) throw new AppError("Acesso de portaria não encontrado", 404);
  if (acesso.status === "SAIU" || acesso.status === "BLOQUEADO") {
    throw new AppError("O acesso não pode receber condutor neste status", 422, { status: acesso.status });
  }

  const telefone = input.telefone.startsWith("55") ? `+${input.telefone}` : `+55${input.telefone}`;
  const motorista = await prisma.motorista.upsert({
    where: { cpf: input.cpf },
    update: { nome: input.nome, telefone },
    create: { nome: input.nome, cpf: input.cpf, telefone },
  });

  const placaNota = acesso.ticket.notas.map((nota) => nota.placa).find(Boolean) ?? null;
  const resultadoRisco = analisarRiscoSimulado({
    cavaloRestrito: acesso.cavalo.restricao,
    cavaloMotivo: acesso.cavalo.motivoRestricao,
    carretaRestrita: acesso.carreta?.restricao ?? false,
    carretaMotivo: acesso.carreta?.motivoRestricao,
    motoristaRestrito: motorista.restricao,
    motoristaMotivo: motorista.motivoRestricao,
    cnhValidade: motorista.cnhValidade,
    placaNota,
    placaPortaria: normalizarPlaca(acesso.cavalo.placa),
  });

  await prisma.$transaction(async (tx) => {
    if (resultadoRisco.status === "APROVADO") {
      await tx.acessoPortaria.update({
        where: { id: acessoId },
        data: { motoristaId: motorista.id, status: "LINK_ENVIADO" },
      });
      await tx.ticket.update({
        where: { id: acesso.ticketId },
        data: { status: "AGUARDANDO_MOTORISTA" },
      });
    } else {
      await tx.acessoPortaria.update({
        where: { id: acessoId },
        data: { motoristaId: motorista.id, status: "BLOQUEADO" },
      });
      await tx.ticket.update({
        where: { id: acesso.ticketId },
        data: { status: "BLOQUEADO" },
      });
      await tx.ocorrencia.create({
        data: {
          ticketId: acesso.ticketId,
          tipo: "RISCO",
          descricao: "Entrada bloqueada pela análise simulada de risco",
          dados: { acessoId, score: resultadoRisco.score, motivos: resultadoRisco.motivos } as object,
        },
      });
      await tx.notificacao.create({
        data: {
          ticketId: acesso.ticketId,
          acessoId,
          canal: "SMS",
          destino: "ADM",
          mensagem: `Entrada bloqueada por risco: acesso ${acessoId}, score ${resultadoRisco.score}.`,
        },
      });
    }

    await tx.analiseRisco.create({
      data: {
        ticketId: acesso.ticketId,
        acessoId,
        status: resultadoRisco.status,
        score: resultadoRisco.score,
        motivos: resultadoRisco.motivos,
      },
    });

    await tx.eventoTicket.create({
      data: {
        ticketId: acesso.ticketId,
        tipo: "CONDUTOR_INFORMADO",
        descricao: "Condutor informado e análise de risco iniciada",
        dados: { acessoId, cpf: motorista.cpf, statusRisco: resultadoRisco.status, score: resultadoRisco.score } as object,
      },
    });
  });

  return {
    acessoId,
    status: resultadoRisco.status === "APROVADO" ? "LINK_ENVIADO" : "BLOQUEADO",
    ticketStatus: resultadoRisco.status === "APROVADO" ? "AGUARDANDO_MOTORISTA" : "BLOQUEADO",
    analiseRisco: resultadoRisco,
    proximoPasso: resultadoRisco.status === "APROVADO" ? "AGUARDANDO_LINK_DO_MOTORISTA" : "AGUARDANDO_CORRECAO_DO_ADM",
  };
}

export async function listarAcessos(status?: AcessoStatus) {
  const acessos = await prisma.acessoPortaria.findMany({
    where: status ? { status } : undefined,
    include: { ticket: true, cavalo: true, carreta: true, motorista: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    total: acessos.length,
    acessos: acessos.map((acesso) => ({
      id: acesso.id,
      status: acesso.status,
      entradaEm: acesso.entradaEm,
      saidaEm: acesso.saidaEm,
      ticket: { id: acesso.ticket.id, codigo: acesso.ticket.codigo, status: acesso.ticket.status },
      cavalo: { id: acesso.cavalo.id, placa: acesso.cavalo.placa, tipo: acesso.cavalo.tipo, frota: acesso.cavalo.frota },
      carreta: acesso.carreta ? { id: acesso.carreta.id, placa: acesso.carreta.placa } : null,
      motorista: acesso.motorista ? { id: acesso.motorista.id, nome: acesso.motorista.nome, cpf: acesso.motorista.cpf, telefone: acesso.motorista.telefone } : null,
    })),
  };
}
