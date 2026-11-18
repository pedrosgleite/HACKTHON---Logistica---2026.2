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
npm run db:migrate   # aplica migrations (quando houver models)
npm run db:seed      # popula docas, veículos, motoristas e clientes de teste
npm run dev          # servidor em modo watch
```
Teste: `GET http://localhost:3333/health` → `{ "status": "ok" }` · Swagger: http://localhost:3333/docs

## Onde está o quê
- `src/shared/contratos/` — stubs dos contratos C1–C5 entre os devs (ROADMAP §4)
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
