import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3333";

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  console.log(`\n${method} ${path} -> ${response.status}`);
  console.log(JSON.stringify(data, null, 2));
  return { status: response.status, data };
}

try {
  await request("GET", "/health");

  const ticket = await prisma.ticket.upsert({
    where: { codigo: "TK-TESTE-PORTARIA" },
    update: { status: "CRIADO", origem: "MANUAL", frota: "TERCEIRA", tipoPatio: "RECEBIMENTO" },
    create: { codigo: "TK-TESTE-PORTARIA", status: "CRIADO", origem: "MANUAL", frota: "TERCEIRA", tipoPatio: "RECEBIMENTO" },
  });
  console.log(`\nTicket de teste: ${ticket.id}`);

  const entrada = await request("POST", "/portaria/entrada", {
    placa: "TER3F45",
    ticketId: ticket.id,
  });

  if (entrada.status === 201) {
    const acessoId = entrada.data.acessoId;

    await request("PATCH", `/portaria/${acessoId}/carreta`, {
      placa: "TCR5H67",
    });

    await request("PATCH", `/portaria/${acessoId}/condutor`, {
      nome: "Joao da Silva",
      cpf: "11144477735",
      telefone: "+5511990000001",
    });

    await request("PATCH", `/portaria/${acessoId}/condutor`, {
      nome: "Pedro Almeida",
      cpf: "44477700068",
      telefone: "+5511990000004",
    });
  }

  await request("GET", "/portaria/acessos");
  await request("POST", "/portaria/entrada", { placa: "XXX0X00" });
} finally {
  await prisma.$disconnect();
}
