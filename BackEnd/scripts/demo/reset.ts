/**
 * Zera os dados de operação e reaplica o seed — deixa o banco pronto para a demo (SPEC-11).
 *
 *   npm run demo:reset              → só mostra o que seria apagado (nada é alterado)
 *   npm run demo:reset -- --confirmar → apaga de verdade
 *
 * ⚠️ O banco do Neon é COMPARTILHADO: isto apaga TODOS os tickets, notas, acessos,
 * romaneios, entregas, posições, notificações e eventos de todo mundo.
 * Mantém o cadastro do seed (docas, clientes, veículos e motoristas de scripts/seed-data.ts)
 * e remove veículos/motoristas criados fora do seed (ex.: placas DEM*** da demo).
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { motoristas, veiculos } from "../seed-data";

const prisma = new PrismaClient({ transactionOptions: { timeout: 120_000, maxWait: 20_000 } });
const confirmar = process.argv.includes("--confirmar");

const placasSeed = veiculos.map((v) => v.placa);
const cpfsSeed = motoristas.map((m) => m.cpf);

async function main() {
  const contagem = {
    tickets: await prisma.ticket.count(),
    notas: await prisma.notaFiscal.count(),
    acessos: await prisma.acessoPortaria.count(),
    romaneios: await prisma.romaneio.count(),
    entregas: await prisma.entrega.count(),
    posicoes: await prisma.posicaoVeiculo.count(),
    notificacoes: await prisma.notificacao.count(),
    eventos: await prisma.eventoTicket.count(),
    alocacoesDoca: await prisma.alocacaoDoca.count(),
    fila: await prisma.filaDoca.count(),
    veiculosForaDoSeed: await prisma.veiculo.count({ where: { placa: { notIn: placasSeed } } }),
    motoristasForaDoSeed: await prisma.motorista.count({ where: { cpf: { notIn: cpfsSeed } } }),
  };
  console.log("Dados que serão apagados:", contagem);

  if (!confirmar) {
    console.log("\nNada foi alterado. Para apagar de verdade: npm run demo:reset -- --confirmar");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // ordem respeita as chaves estrangeiras
    await tx.entrega.deleteMany();
    await tx.ocorrencia.deleteMany();
    await tx.posicaoVeiculo.deleteMany();
    await tx.notificacao.deleteMany();
    await tx.analiseRisco.deleteMany();
    await tx.alocacaoDoca.deleteMany();
    await tx.filaDoca.deleteMany();
    await tx.notaFiscal.deleteMany();
    await tx.romaneio.deleteMany();
    await tx.acessoPortaria.deleteMany();
    await tx.eventoTicket.deleteMany();
    await tx.ticket.deleteMany();
    await tx.veiculo.deleteMany({ where: { placa: { notIn: placasSeed } } });
    await tx.motorista.deleteMany({ where: { cpf: { notIn: cpfsSeed } } });
    await tx.doca.updateMany({ data: { status: "LIVRE" } });
  });
  console.log("\nDados apagados. Reaplicando o seed…");
  await prisma.$disconnect();
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  console.log("\nBanco pronto para a demo: npm run demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
