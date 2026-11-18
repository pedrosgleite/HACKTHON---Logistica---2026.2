/** Funções puras de geografia/ETA (SPEC-05) — sem banco. */

export interface Ponto {
  lat: number;
  lng: number;
}

const RAIO_TERRA_KM = 6371;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em km entre dois pontos (fórmula de haversine). */
export function haversineKm(a: Ponto, b: Ponto): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * ETA em minutos = distância ÷ velocidade.
 * Velocidade ausente ou muito baixa (parado/trânsito) usa a velocidade padrão,
 * para o ETA não ir ao infinito.
 */
export function calcularEta(distanciaKm: number, velocidadeKmh: number | undefined, padraoKmh: number, minimaKmh = 5) {
  const velocidadeUsada = velocidadeKmh !== undefined && velocidadeKmh >= minimaKmh ? velocidadeKmh : padraoKmh;
  return { etaMinutos: Math.round((distanciaKm / velocidadeUsada) * 60), velocidadeUsada };
}

/** Quantos minutos a nova previsão de chegada atrasou em relação à anterior (negativo = adiantou). */
export function atrasoMinutos(anterior: { em: Date; etaMinutos: number }, atual: { em: Date; etaMinutos: number }): number {
  const chegadaAnterior = anterior.em.getTime() + anterior.etaMinutos * 60_000;
  const chegadaAtual = atual.em.getTime() + atual.etaMinutos * 60_000;
  return Math.round((chegadaAtual - chegadaAnterior) / 60_000);
}

export type EventoCerca = "ENTRADA" | "SAIDA" | null;

/** Detecta cruzamento do raio da cerca. Primeira posição já dentro conta como ENTRADA. */
export function detectarCerca(distAnteriorKm: number | null, distAtualKm: number, raioKm: number): EventoCerca {
  const dentroAgora = distAtualKm <= raioKm;
  const dentroAntes = distAnteriorKm !== null && distAnteriorKm <= raioKm;
  if (dentroAgora && !dentroAntes) return "ENTRADA";
  if (!dentroAgora && dentroAntes) return "SAIDA";
  return null;
}
