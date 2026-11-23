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

Preencha também `PORT` (padrão 3333) e `EMPRESA_CNPJ`. Para os links enviados ao motorista apontarem para outro host, configure `PUBLIC_BASE_URL` (por exemplo, a URL pública do backend); sem isso, será usado `http://localhost:<PORT>`.

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
- `src/shared/contratos/` — contratos C1–C5 entre os devs (ROADMAP §4). C1–C5 implementados
- `src/modules/motorista/` — link, confirmação, localização e log de notificações simuladas (SPEC-08)
- `src/shared/saida.ts` — `registrarSaida()`, a mesma função de saída da portaria e da cerca (SPEC-10)
- `src/shared/transacao.ts` — retry de transações em conflito (pedidos simultâneos de doca)
- `scripts/demo/` — demo ponta a ponta e reset do banco (SPEC-11) · `docs/demo.http` — mesmos cenários para clicar
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
| `demo` | roda os 5 cenários da demo pela API (ver abaixo) |
| `demo:reset` | mostra o que seria apagado; com `-- --confirmar` zera a operação e reaplica o seed |

## Demo ponta a ponta (SPEC-11)
```powershell
npm run demo:reset -- --confirmar   # ⚠️ apaga TODOS os tickets do banco compartilhado e reaplica o seed
npm run dev                         # em outro terminal
npm run demo                        # os 5 cenários, narrados; termina com código 1 se algo falhar
npm run demo -- 1 3 --pausa=1500    # só os cenários 1 e 3, com pausa entre os passos (para apresentar)
npm run demo -- --api=https://sua-api.onrender.com   # contra a API publicada
```
Cenários: **1** terceiro aprovado (XML → … → encerrado) · **2** terceiro reprovado → troca de motorista → reanálise · **3** frota própria (rastreio → cerca → doca → saída pela cerca) · **4** fila de docas · **5** placa sem ticket.

Para clicar requisição por requisição: abra `docs/demo.http` no VS Code com a extensão **REST Client**.

## Deploy (Render ou Railway)
- **Build:** `npm install && npm run build` (o `postinstall` já roda o `prisma generate`)
- **Start:** `npm start`
- **Variáveis:** as mesmas do `.env` (`DATABASE_URL`, `DIRECT_URL`, `EMPRESA_CNPJ`, opcionais da cerca) + `PUBLIC_BASE_URL` com a URL pública da API (usada nos links do motorista). O `PORT` é definido pela plataforma.
- As migrations já estão aplicadas no Neon; não precisa rodar nada no deploy.

## Simular o rastreio (SPEC-05)
Com o servidor rodando, envia posições de um veículo **da frota própria** se aproximando do CD até entrar na cerca:
```powershell
npm run simular:rastreio -- ABC1D23 --km=5 --passos=8 --intervalo=500   # --sair simula a saída da cerca
```
A placa precisa ter um ticket aberto (ex.: importe `scripts/xml/coleta.xml` antes).
Variáveis opcionais no `.env` (padrões entre parênteses): `CD_LAT` (-23.5505), `CD_LNG` (-46.6333), `CERCA_RAIO_KM` (0.5), `ATRASO_LIMITE_MIN` (15), `VELOCIDADE_PADRAO_KMH` (60).
