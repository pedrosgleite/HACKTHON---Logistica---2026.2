# ARGOS IA LOGISTIC — BackEnd

API REST em Node.js + TypeScript (Express, Zod, Prisma 6, PostgreSQL no Neon).
Documentação do projeto em [docs/PROJETO.md](docs/PROJETO.md) e [docs/ROADMAP.md](docs/ROADMAP.md).

## Requisitos
- Node.js 20+
- Um projeto no [Neon](https://neon.tech)

## Instalação
```powershell
npm install
Copy-Item .env.example .env
```

## Configurar o `.env`
No painel do Neon, em **Connect**, copie duas connection strings:
- `DATABASE_URL` → com **Connection pooling ligado** (host contém `-pooler`). Acrescente `&pgbouncer=true`.
- `DIRECT_URL` → com pooling **desligado** (host sem `-pooler`). Usada pelas migrations.

Preencha também `PORT` (padrão 3333) e `EMPRESA_CNPJ`.

## Rodar
```powershell
npx prisma generate  # gera o Prisma Client local a partir do schema
npm run dev          # servidor em modo watch
```
O banco (Neon) é **compartilhado** e já tem as migrations e o seed aplicados — não precisa rodar `db:migrate` nem `db:seed` para começar.

## ⚠️ Depois de todo `git pull`: `npx prisma generate`
O banco é um só, na nuvem, mas o **Prisma Client** (os tipos/funções `prisma.ticket`, `prisma.doca`…) é gerado **na sua máquina**, dentro de `node_modules`, a partir do `schema.prisma`.
Se alguém mudou o schema e você não regenerou, o código não compila (`Property 'ticket' does not exist…`) mesmo com as tabelas já existindo no Neon.

| Situação | Comando |
|---|---|
| Puxei mudanças do `schema.prisma` | `npx prisma generate` (ou `npm install`, que roda o generate no `postinstall`) |
| **Eu** alterei o `schema.prisma` | `npm run db:migrate` — cria a migration, aplica no Neon e gera o client. Basta **uma pessoa** rodar; depois é só commitar a pasta `prisma/migrations` |
| Banco novo/zerado | `npm run db:migrate` e `npm run db:seed` |
Teste: `GET http://localhost:3333/health` → `{ "status": "ok" }` · Swagger: http://localhost:3333/docs

## Onde está o quê
- `src/shared/contratos/` — contratos C1–C5 entre os devs (ROADMAP §4). C2, C4 e C5 implementados; C1 e C3 ainda stubs (Dev B)
- `src/shared/saida.ts` — `registrarSaida()` **provisória** (SPEC-10 é do Dev B), já usada pela cerca
- `src/shared/errors.ts` — `AppError` e handler no formato `{ erro, detalhes }`
- `src/shared/swagger.ts` — documento OpenAPI (cada módulo adiciona suas rotas)
- `scripts/seed.ts` + `scripts/seed-data.ts` — dados de teste
- `scripts/xml/` — NF-e de exemplo: coleta, recebimento e transferência (CNPJ do CD: `11222333000181`)

## Scripts
| Script | O que faz |
|---|---|
| `dev` | `tsx watch src/server.ts` |
| `build` / `start` | compila para `dist/` e roda |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | `prisma studio` |
| `db:generate` | `prisma generate` |
| `db:seed` | `tsx scripts/seed.ts` |
| `simular:rastreio` | simulador do rastreador (ver abaixo) |

## Simular o rastreio (SPEC-05)
Com o servidor rodando, envia posições de um veículo **da frota própria** se aproximando do CD até entrar na cerca:
```powershell
npm run simular:rastreio -- ABC1D23 --km=5 --passos=8 --intervalo=500   # --sair simula a saída da cerca
```
A placa precisa ter um ticket aberto (ex.: importe `scripts/xml/coleta.xml` antes).
Variáveis opcionais no `.env` (padrões entre parênteses): `CD_LAT` (-23.5505), `CD_LNG` (-46.6333), `CERCA_RAIO_KM` (0.5), `ATRASO_LIMITE_MIN` (15), `VELOCIDADE_PADRAO_KMH` (60).
