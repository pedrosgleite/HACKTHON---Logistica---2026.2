/**
 * Seed da SPEC-00 — rode com `npm run db:seed` depois da primeira migration.
 *
 * ATENÇÃO: escrito ANTES do schema.prisma. Os nomes de models/campos abaixo
 * (doca.numero, veiculo.placa, motorista.cpf, restricao, cnhValidade...) são uma
 * sugestão — ajuste para bater com o schema final.
 * Os campos tipo/frota são strings que devem bater com os valores dos enums.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { clientes, docas, motoristas, veiculos } from "./seed-data";

const prisma = new PrismaClient() as any; // `any` até os models existirem

async function main() {
  for (const d of docas) {
    await prisma.doca.upsert({ where: { numero: d.numero }, update: {}, create: d });
  }
  for (const c of clientes) {
    await prisma.cliente.upsert({ where: { cnpj: c.cnpj }, update: {}, create: c });
  }
  for (const v of veiculos) {
    await prisma.veiculo.upsert({ where: { placa: v.placa }, update: {}, create: v });
  }
  for (const m of motoristas) {
    await prisma.motorista.upsert({ where: { cpf: m.cpf }, update: {}, create: m });
  }
  console.log(`Seed ok: ${docas.length} docas, ${clientes.length} clientes, ${veiculos.length} veiculos, ${motoristas.length} motoristas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
