/** Configuração da cerca/ETA via .env (com padrões para a demo). */
const num = (v: string | undefined, padrao: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : padrao;
};

export function configRastreio() {
  return {
    cd: { lat: num(process.env.CD_LAT, -23.5505), lng: num(process.env.CD_LNG, -46.6333) },
    raioCercaKm: num(process.env.CERCA_RAIO_KM, 0.5),
    limiteAtrasoMin: num(process.env.ATRASO_LIMITE_MIN, 15),
    velocidadePadraoKmh: num(process.env.VELOCIDADE_PADRAO_KMH, 60),
  };
}
