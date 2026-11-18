/**
 * Seed da SPEC-00 — rode com `npm run db:seed` depois da primeira migration.
 */
import "dotenv/config";
import {
  DocaTipo,
  PrismaClient,
  TipoFrota,
  TipoVeiculo,
} from "@prisma/client";
import { clientes, docas, motoristas, veiculos } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  for (const d of docas) {
    await prisma.doca.upsert({
      where: { numero: d.numero },
      update: { tipo: d.tipo as DocaTipo },
      create: { numero: d.numero, tipo: d.tipo as DocaTipo },
    });
  }
  for (const c of clientes) {
    await prisma.cliente.upsert({ where: { cnpj: c.cnpj }, update: c, create: c });
  }
  for (const v of veiculos) {
    await prisma.veiculo.upsert({
      where: { placa: v.placa },
      update: {
        tipo: v.tipo as TipoVeiculo,
        frota: v.frota as TipoFrota,
        restricao: v.restricao ?? false,
        motivoRestricao: v.motivoRestricao,
      },
      create: {
        placa: v.placa,
        tipo: v.tipo as TipoVeiculo,
        frota: v.frota as TipoFrota,
        restricao: v.restricao ?? false,
        motivoRestricao: v.motivoRestricao,
      },
    });
  }
  for (const m of motoristas) {
    await prisma.motorista.upsert({
      where: { cpf: m.cpf },
      update: {
        nome: m.nome,
        telefone: m.telefone,
        cnhNumero: m.cnhNumero,
        cnhValidade: m.cnhValidade,
        restricao: m.restricao ?? false,
        motivoRestricao: m.motivoRestricao,
      },
      create: {
        nome: m.nome,
        cpf: m.cpf,
        telefone: m.telefone,
        cnhNumero: m.cnhNumero,
        cnhValidade: m.cnhValidade,
        restricao: m.restricao ?? false,
        motivoRestricao: m.motivoRestricao,
      },
    });
  }
  console.log(`Seed ok: ${docas.length} docas, ${clientes.length} clientes, ${veiculos.length} veiculos, ${motoristas.length} motoristas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
