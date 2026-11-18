/**
 * Simulador do rastreador (SPEC-05): envia posições de um veículo se aproximando do CD
 * até entrar na cerca eletrônica. Opcionalmente depois sai da cerca.
 *
 * Uso:
 *   npm run simular:rastreio -- <PLACA> [opções]
 *
 * Opções:
 *   --km=10          distância inicial até o CD (padrão 10)
 *   --passos=12      quantas posições até chegar (padrão 12)
 *   --intervalo=1000 ms entre posições (padrão 1000)
 *   --velocidade=60  km/h informada (padrão 60)
 *   --sair           depois de entrar, simula a saída da cerca
 *   --api=http://localhost:3333
 *
 * Exemplo: npm run simular:rastreio -- ABC1D23 --km=5 --passos=8 --intervalo=500
 */
import "dotenv/config";

const args = process.argv.slice(2);
const placa = args.find((a) => !a.startsWith("--"));
const opt = (nome: string, padrao: number) => {
  const a = args.find((x) => x.startsWith(`--${nome}=`));
  return a ? Number(a.split("=")[1]) : padrao;
};
const api = args.find((a) => a.startsWith("--api="))?.split("=")[1] ?? `http://localhost:${process.env.PORT ?? 3333}`;

if (!placa) {
  console.error("Informe a placa. Ex.: npm run simular:rastreio -- ABC1D23");
  process.exit(1);
}

const cd = { lat: Number(process.env.CD_LAT ?? -23.5505), lng: Number(process.env.CD_LNG ?? -46.6333) };
const kmInicial = opt("km", 10);
const passos = opt("passos", 12);
const intervalo = opt("intervalo", 1000);
const velocidade = opt("velocidade", 60);
const KM_POR_GRAU_LAT = 111.32;

/** Ponto ao norte do CD a `km` de distância. */
const pontoA = (km: number) => ({ lat: cd.lat + km / KM_POR_GRAU_LAT, lng: cd.lng });
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enviar(lat: number, lng: number, vel: number) {
  const r = await fetch(`${api}/rastreio/posicao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placa, lat, lng, velocidade: vel }),
  });
  const j = await r.json();
  if (!r.ok) {
    console.error(`  ✘ ${r.status}`, j);
    process.exit(1);
  }
  const cerca = j.cerca ? `  cerca=${JSON.stringify(j.cerca)}` : "";
  console.log(
    `  ${String(j.distanciaKm ?? "-").padStart(7)} km  ETA ${String(j.etaMinutos ?? "-").padStart(3)} min  ticket ${j.ticket.codigo} ${j.ticket.status}${cerca}`,
  );
  return j;
}

(async () => {
  console.log(`Simulando ${placa}: ${kmInicial} km → CD (${cd.lat}, ${cd.lng}) em ${passos} passos`);
  for (let i = 0; i <= passos; i++) {
    const km = kmInicial * (1 - i / passos);
    const p = pontoA(km);
    await enviar(p.lat, p.lng, i === passos ? 0 : velocidade);
    if (i < passos) await esperar(intervalo);
  }
  if (args.includes("--sair")) {
    console.log("Saindo da cerca…");
    for (const km of [0.3, 1, 3]) {
      await esperar(intervalo);
      const p = pontoA(-km);
      await enviar(p.lat, p.lng, velocidade);
    }
  }
})();
