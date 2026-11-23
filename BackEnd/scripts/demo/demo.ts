/**
 * Demo ponta a ponta (SPEC-11): roda os 5 cenários só pela API, narrando cada passo.
 *
 *   npm run demo:reset -- --confirmar   (recomendado antes: banco limpo, docas livres)
 *   npm run dev                          (em outro terminal)
 *   npm run demo                         → todos os cenários
 *   npm run demo -- 1 3                  → só os cenários 1 e 3
 *   npm run demo -- --pausa=1500         → pausa (ms) entre os passos, para apresentar
 *   npm run demo -- --api=https://...    → contra a API publicada
 *
 * Termina com código 1 se algum passo não sair como esperado.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const API = (args.find((a) => a.startsWith("--api="))?.slice(6) ?? `http://localhost:${process.env.PORT ?? 3333}`).replace(/\/+$/, "");
const PAUSA = Number(args.find((a) => a.startsWith("--pausa="))?.slice(8) ?? 0);
const escolhidos = args.filter((a) => /^[1-5]$/.test(a)).map(Number);
const roda = (n: number) => escolhidos.length === 0 || escolhidos.includes(n);

const CD = { lat: Number(process.env.CD_LAT ?? -23.5505), lng: Number(process.env.CD_LNG ?? -46.6333) };
const POD = { recebedorNome: "Maria Recebedora", recebedorDoc: "12345678900", comprovanteUrl: "https://exemplo.com/pod/assinatura.jpg" };
const XML_DIR = path.join(__dirname, "..", "xml");

let falhas = 0;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const titulo = (t: string) => console.log(`\n\x1b[1m━━ ${t} ━━\x1b[0m`);
async function passo(texto: string, ok: boolean, detalhe = "") {
  console.log(`  ${ok ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m"} ${texto}${detalhe ? `  \x1b[2m${detalhe}\x1b[0m` : ""}`);
  if (!ok) falhas++;
  if (PAUSA) await esperar(PAUSA);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
async function api(method: string, rota: string, body?: unknown, xml = false): Promise<{ s: number; j: Json }> {
  const r = await fetch(API + rota, {
    method,
    headers: body === undefined ? {} : { "Content-Type": xml ? "application/xml" : "application/json" },
    body: body === undefined ? undefined : xml ? (body as string) : JSON.stringify(body),
  });
  const t = await r.text();
  try {
    return { s: r.status, j: JSON.parse(t) };
  } catch {
    return { s: r.status, j: t };
  }
}

/** XML de exemplo com chave/número novos (a demo pode rodar várias vezes) e, opcionalmente, outra placa. */
let seq = 0;
function nota(arquivo: string, placa?: string) {
  seq++;
  let x = fs.readFileSync(path.join(XML_DIR, arquivo), "utf8");
  const chave = x.match(/Id="NFe(\d{44})"/)![1];
  const serial = (Date.now() % 1e7).toString().padStart(7, "0") + String(seq).padStart(2, "0");
  x = x.replace(chave, chave.slice(0, 25) + serial + chave.slice(34)).replace(/<nNF>\d+</, `<nNF>${serial.slice(-6)}<`);
  if (placa) x = x.replace(/<placa>[^<]*<\/placa>/, `<placa>${placa}</placa>`);
  return x;
}
const importar = (arquivo: string, placa?: string) => api("POST", "/nfe/xml?origemSistema=SAP", nota(arquivo, placa), true);
const ponto = (km: number) => ({ lat: CD.lat + km / 111.32, lng: CD.lng }); // km ao norte do CD

/** Lê o token do link na notificação enviada ao motorista (como ele leria o SMS). */
async function tokenDoLink(ticketId: string): Promise<string | undefined> {
  const n = await api("GET", "/notificacoes");
  const msg = (n.j as Json[]).find((x) => x.ticket?.id === ticketId && /\/motorista\/link\//.test(x.mensagem))?.mensagem as string | undefined;
  return msg?.match(/\/motorista\/link\/([a-f0-9]+)/)?.[1];
}

async function romaneioLiberado(ticketId: string) {
  const r = await api("POST", "/romaneios", { ticketId });
  if (r.s !== 201) return r;
  await api("POST", `/romaneios/${r.j.id}/conferir`, { itens: r.j.notas.map((n: Json) => ({ notaFiscalId: n.id, volumes: n.volumes })) });
  return api("POST", `/romaneios/${r.j.id}/liberar`);
}

async function entregarTudo(ticketId: string) {
  const { j } = await api("GET", `/entregas?ticketId=${ticketId}`);
  let ultimo: Json;
  for (const e of j.entregas) ultimo = (await api("POST", `/entregas/${e.id}/baixa`, { volumesEntregues: e.volumesPrevistos, ...POD })).j;
  return ultimo;
}

/** Terceiro passando pela portaria com condutor aprovado → AGUARDANDO_MOTORISTA. */
async function terceiroAprovado(ticketId: string, placa: string, carreta?: string) {
  const e = await api("POST", "/portaria/entrada", { placa, ticketId });
  await api("PATCH", `/portaria/${e.j.acessoId}/carreta`, carreta ? { placa: carreta } : { somenteCavalo: true });
  const c = await api("PATCH", `/portaria/${e.j.acessoId}/condutor`, { nome: "Joao da Silva", cpf: "11144477735", telefone: "+5511990000001" });
  return { acessoId: e.j.acessoId as string, risco: c };
}

async function cenario1() {
  titulo("Cenário 1 — Terceiro aprovado: XML → … → encerrado");
  const n = await importar("recebimento.xml");
  const T = n.j.ticket?.id;
  await passo("XML da NF-e importado → ticket criado pela triagem", n.s === 201, `${n.j.ticket?.codigo} ${n.j.ticket?.tipoPatio}/${n.j.ticket?.frota}`);
  const e = await api("POST", "/portaria/entrada", { placa: "TER3F45", ticketId: T });
  await passo("Portaria registra a entrada do cavalo TER3F45", e.s === 201, `próximo passo: ${e.j.proximoPasso}`);
  const c = await api("PATCH", `/portaria/${e.j.acessoId}/carreta`, { placa: "TCR5H67" });
  await passo("Porteiro informa a carreta TCR5H67", c.s === 200);
  const r = await api("PATCH", `/portaria/${e.j.acessoId}/condutor`, { nome: "Joao da Silva", cpf: "11144477735", telefone: "+5511990000001" });
  await passo("Condutor informado → análise de risco APROVADA", r.j.status === "APROVADO", `score ${r.j.analiseRisco?.score}`);
  const token = await tokenDoLink(T);
  await passo("Link enviado ao motorista por SMS e WhatsApp", Boolean(token));
  const l = await api("GET", `/motorista/link/${token}`);
  await passo("Motorista abre o link e vê ticket e veículo", l.s === 200, `${l.j.ticket?.codigo} — cavalo ${l.j.veiculos?.cavalo?.placa}`);
  const cf = await api("POST", `/motorista/link/${token}/confirmar`);
  await passo("Motorista confirma → recebe a doca", cf.s === 200 && Boolean(cf.j.numeroDoca), cf.j.numeroDoca ? `doca ${cf.j.numeroDoca}` : `fila ${cf.j.posicaoFila}`);
  const rom = await romaneioLiberado(T);
  await passo("Romaneio montado, conferido e liberado (entregas geradas)", rom.j.status === "LIBERADO", `${rom.j.codigo}, ${rom.j.entregas?.length} entrega(s)`);
  const ld = await api("POST", `/docas/${cf.j.docaId}/liberar`);
  await passo("Doca liberada → ticket LIBERADO_SAIDA", ld.s === 200);
  const s = await api("POST", `/portaria/${e.j.acessoId}/saida`);
  await passo("Porteiro dá baixa na saída → EM_TRANSITO, monitoramento iniciado", s.j.ticketStatus === "EM_TRANSITO", `${s.j.entregasEmRota} entrega(s) em rota`);
  const loc = await api("POST", `/motorista/link/${token}/localizacao`, { placa: "TER3F45", ...ponto(25), velocidade: 70 });
  await passo("Motorista envia a localização pelo link durante a viagem", loc.s === 201);
  const fim = await entregarTudo(T);
  await passo("Entregas baixadas com comprovante → romaneio FINALIZADO → ticket ENCERRADO", fim?.ticketEncerrado === true);
}

async function cenario2() {
  titulo("Cenário 2 — Terceiro reprovado: CNH vencida → bloqueio → troca de motorista → reanálise");
  const n = await importar("recebimento.xml");
  const T = n.j.ticket?.id;
  await passo("XML importado → ticket criado", n.s === 201, n.j.ticket?.codigo);
  const e = await api("POST", "/portaria/entrada", { placa: "TER3F45", ticketId: T });
  await api("PATCH", `/portaria/${e.j.acessoId}/carreta`, { somenteCavalo: true });
  const r = await api("PATCH", `/portaria/${e.j.acessoId}/condutor`, { nome: "Marcos Souza", cpf: "33366699957", telefone: "+5511990000003" });
  await passo("Condutor com CNH vencida → REPROVADO → ticket BLOQUEADO", r.j.status === "REPROVADO" && r.j.ticketStatus === "BLOQUEADO", (r.j.analiseRisco?.motivos ?? []).join(", "));
  const p = await api("GET", "/painel");
  await passo("Ticket volta ao Painel Central (ocorrência RISCO aberta)", p.j.ocorrenciasAbertas?.itens?.some((o: Json) => o.tipo === "RISCO" && o.ticket?.id === T));
  const r2 = await api("PATCH", `/portaria/${e.j.acessoId}/condutor`, { nome: "Carlos Pereira", cpf: "22255588846", telefone: "+5511990000002" });
  await passo("ADM troca o motorista → reanálise APROVADA", r2.j.status === "APROVADO" && r2.j.ticketStatus === "AGUARDANDO_MOTORISTA", `score ${r2.j.analiseRisco?.score}`);
  const h = await api("GET", `/risco/acessos/${e.j.acessoId}`);
  await passo("Histórico mantém as duas análises", h.j.historico?.length === 2, (h.j.historico ?? []).map((x: Json) => x.status).join(" ← "));
}

async function cenario3() {
  titulo("Cenário 3 — Frota própria: XML → rastreio → ETA → cerca → doca → saída pela cerca");
  const n = await importar("coleta.xml");
  const T = n.j.ticket?.id;
  await passo("XML importado → frota PROPRIA (placa ABC1D23)", n.j.ticket?.frota === "PROPRIA", n.j.ticket?.codigo);
  for (const km of [12, 8, 4]) {
    const pos = await api("POST", "/rastreio/posicao", { placa: "ABC1D23", ...ponto(km), velocidade: 60 });
    await passo(`Rastreador: ${km} km do CD`, pos.s === 201, `ETA ${pos.j.etaMinutos} min — ${pos.j.ticket?.status}`);
  }
  const eta = await api("GET", `/tickets/${T}/eta`);
  await passo("Painel consulta o ETA", eta.j.disponivel === true, `${eta.j.distanciaKm} km, chegada ${new Date(eta.j.previsaoChegada).toLocaleTimeString("pt-BR")}`);
  const ent = await api("POST", "/rastreio/posicao", { placa: "ABC1D23", ...ponto(0.1), velocidade: 5 });
  await passo("Entra na cerca → entrada automática → doca alocada", ent.j.cerca?.evento === "ENTRADA" && Boolean(ent.j.cerca?.doca?.numeroDoca), `doca ${ent.j.cerca?.doca?.numeroDoca ?? "fila " + ent.j.cerca?.doca?.posicaoFila}`);
  const rom = await romaneioLiberado(T);
  await passo("Carregamento: romaneio conferido e liberado", rom.j.status === "LIBERADO", rom.j.codigo);
  await api("POST", `/docas/${ent.j.cerca?.doca?.docaId}/liberar`);
  const sai = await api("POST", "/rastreio/posicao", { placa: "ABC1D23", ...ponto(1.5), velocidade: 40 });
  await passo("Sai da cerca → saída registrada automaticamente → EM_TRANSITO", sai.j.cerca?.registrada === true && sai.j.ticket?.status === "EM_TRANSITO");
  const fim = await entregarTudo(T);
  await passo("Entrega concluída → ticket ENCERRADO", fim?.ticketEncerrado === true);
}

async function cenario4() {
  titulo("Cenário 4 — Fila: 4 docas de coleta ocupadas → 5º caminhão na fila → liberação puxa o próximo");
  const docas = await api("GET", "/docas");
  const livres = (docas.j as Json[]).filter((d) => d.tipo === "COLETA" && d.status === "LIVRE").length;
  await passo("4 docas de coleta livres no início", livres === 4, livres === 4 ? "" : `só ${livres} livre(s) — rode npm run demo:reset -- --confirmar`);
  const ts: { T: string; codigo: string; placa: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const placa = `DEM${i}A0${i}`;
    const n = await importar("coleta.xml", placa);
    await terceiroAprovado(n.j.ticket.id, placa);
    ts.push({ T: n.j.ticket.id, codigo: n.j.ticket.codigo, placa });
  }
  await passo("5 caminhões de coleta aprovados na portaria", ts.length === 5, ts.map((t) => t.placa).join(", "));
  const aloc = await Promise.all(ts.map((t) => api("POST", "/docas/alocar", { ticketId: t.T })));
  const comDoca = aloc.filter((a) => a.j.docaId);
  const quinto = ts[aloc.findIndex((a) => a.j.posicaoFila)];
  await passo("Pedidos simultâneos: 4 ganham doca, 1 vai para a fila", comDoca.length === 4 && Boolean(quinto),
    aloc.map((a, i) => `${ts[i].placa}→${a.j.numeroDoca ? "doca " + a.j.numeroDoca : "fila " + a.j.posicaoFila}`).join("  "));
  const primeiro = ts[aloc.findIndex((a) => a.j.docaId)];
  await romaneioLiberado(primeiro.T);
  const lib = await api("POST", `/docas/${aloc.find((a) => a.j.docaId)!.j.docaId}/liberar`);
  await passo("Doca liberada → o 5º é alocado automaticamente", lib.j.proximo?.ticketId === quinto?.T, `${quinto?.placa} → doca ${lib.j.proximo?.numeroDoca}`);
}

async function cenario5() {
  titulo("Cenário 5 — Placa sem ticket: bloqueio + aviso ao ADM");
  const r = await api("POST", "/portaria/entrada", { placa: "XXX0X00" });
  await passo("Portaria recusa a entrada (409, bloqueado)", r.s === 409 && r.j.detalhes?.bloqueado === true, r.j.erro);
  const n = await api("GET", "/notificacoes");
  await passo("ADM notificado", (n.j as Json[]).some((x) => x.destino === "ADM" && x.mensagem.includes("XXX0X00")));
}

(async () => {
  const h = await api("GET", "/health").catch(() => ({ s: 0, j: null }));
  if (h.s !== 200) {
    console.error(`API não respondeu em ${API}. Suba o servidor com: npm run dev`);
    process.exit(1);
  }
  console.log(`ARGOS — demo ponta a ponta contra ${API}`);
  const cenarios = [cenario1, cenario2, cenario3, cenario4, cenario5];
  for (let i = 0; i < cenarios.length; i++) if (roda(i + 1)) await cenarios[i]();

  const p = await api("GET", "/painel");
  titulo("Painel Central ao final");
  console.log("  tickets por status:", p.j.tickets?.porStatus);
  console.log("  docas ocupadas:", (p.j.docas ?? []).filter((d: Json) => d.ticket).map((d: Json) => `${d.numero}(${d.ticket.codigo})`).join(" ") || "nenhuma");
  console.log("  ocorrências abertas:", p.j.ocorrenciasAbertas?.total);
  console.log(falhas ? `\n\x1b[31m${falhas} passo(s) não saíram como esperado.\x1b[0m` : "\n\x1b[32mDemo concluída: todos os passos ok.\x1b[0m");
  process.exit(falhas ? 1 : 0);
})();
