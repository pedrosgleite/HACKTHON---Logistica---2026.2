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
npm run dev          # servidor em modo watch
```
Teste: `GET http://localhost:3333/health` → `{ "status": "ok" }`

## Scripts
| Script | O que faz |
|---|---|
| `dev` | `tsx watch src/server.ts` |
| `build` / `start` | compila para `dist/` e roda |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | `prisma studio` |
| `db:generate` | `prisma generate` |
