import type { AnaliseRiscoStatus } from "@prisma/client";

export interface DadosAnaliseRisco {
  cavaloRestrito: boolean;
  cavaloMotivo?: string | null;
  carretaRestrita: boolean;
  carretaMotivo?: string | null;
  motoristaRestrito: boolean;
  motoristaMotivo?: string | null;
  cnhValidade?: Date | null;
  placaNota?: string | null;
  placaPortaria: string;
}

export interface ResultadoAnaliseRisco {
  status: AnaliseRiscoStatus;
  score: number;
  motivos: string[];
}

export function analisarRiscoSimulado(dados: DadosAnaliseRisco): ResultadoAnaliseRisco {
  let score = 100;
  const motivos: string[] = [];

  if (!dados.cnhValidade) {
    score -= 60;
    motivos.push("CNH ausente");
  } else if (dados.cnhValidade.getTime() < Date.now()) {
    score -= 60;
    motivos.push("CNH vencida");
  }

  if (dados.cavaloRestrito) {
    score -= 50;
    motivos.push(dados.cavaloMotivo ?? "Cavalo com restrição");
  }
  if (dados.carretaRestrita) {
    score -= 50;
    motivos.push(dados.carretaMotivo ?? "Carreta com restrição");
  }
  if (dados.motoristaRestrito) {
    score -= 50;
    motivos.push(dados.motoristaMotivo ?? "Motorista com restrição");
  }

  if (dados.placaNota) {
    const placaNota = dados.placaNota.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (placaNota !== dados.placaPortaria) {
      score -= 20;
      motivos.push("Placa da portaria diferente da placa da nota fiscal");
    }
  }

  if (score < 70) {
    return { status: "REPROVADO", score: Math.max(0, score), motivos };
  }
  return { status: "APROVADO", score: Math.max(0, score), motivos: motivos.length ? motivos : ["Nenhum risco identificado"] };
}
