# ARGOS IA LOGISTIC — Roadmap do Backend (SDD)

> Plano de execução do backend, dividido entre **duas pessoas**, usando **Spec-Driven Development**.
> As regras de negócio e o contexto estão em [`PROJETO.md`](./PROJETO.md). Este documento diz **o que construir, em que ordem e quem faz**.

---

## 1. Como trabalhamos: Spec-Driven Development

No SDD, **a spec vem antes do código**. Cada funcionalidade tem uma spec com requisitos verificáveis, e o código só existe para cumprir a spec.

### Ciclo de cada spec

```
1. SPEC        → escrever/revisar os requisitos e critérios de aceite
2. CONTRATO    → definir endpoints, payloads, status e erros
3. TAREFAS     → quebrar em tarefas pequenas (checklist)
4. IMPLEMENTAR → codar só o que a spec pede
5. VALIDAR     → testar cada critério de aceite (manual, .http ou teste automatizado)
6. FECHAR      → marcar a spec como ✅ e atualizar o status no quadro abaixo
```

### Regras do time

1. **Sem spec, sem código.** Se surgiu algo novo, primeiro escreve a spec (pode ser curta).
2. **Mudou a regra? Muda a spec antes.** Depois atualiza o código.
3. **Critérios de aceite no formato:** `QUANDO <situação> ENTÃO o sistema DEVE <comportamento>`.
4. **A outra pessoa revisa a spec** antes de começar a implementar (5 minutos de leitura evitam horas de retrabalho).
5. **Contratos entre os dois devs** (seção 4) são combinados antes e não mudam sem avisar.
6. **Schema do Prisma**: mudança combinada no chat; só uma pessoa gera migration por vez.

### Legenda de status

`⬜ A fazer` · `🟨 Spec em revisão` · `🟦 Em implementação` · `✅ Concluída` · `⏸️ Bloqueada (aguardando time)`

---

## 2. Divisão do time

|                     | **Dev A — "Nota e viagem"**                     | **Dev B — "Portaria e pátio"**                      |
| ------------------- | ----------------------------------------------- | --------------------------------------------------- |
| Foco                | Tudo que gira em torno do **ticket e da carga** | Tudo que gira em torno do **caminhão dentro do CD** |
| Raias do fluxograma | 1, 2, 3                                         | 4, 5, 6                                             |
| Specs               | SPEC-01 a SPEC-05                               | SPEC-06 a SPEC-10                                   |

---

## 3. Quadro geral

| Fase | Spec    | Título                             | Dono      | Depende de      | Status |
| ---- | ------- | ---------------------------------- | --------- | --------------- | ------ |
| 0    | SPEC-00 | Fundação (schema, estrutura, seed) | A + B     | —               | ✅     |
| 1    | SPEC-01 | Ingestão do XML e triagem          | A         | 00              | ✅     |
| 1    | SPEC-02 | Tickets e Painel Central           | A         | 00              | ✅     |
| 1    | SPEC-06 | Portaria (entrada)                 | B         | 00              | ✅     |
| 1    | SPEC-07 | Análise de risco (simulada)        | B         | 06              | ✅     |
| 1    | SPEC-09 | Docas e fila                       | B         | 00              | ✅     |
| 2    | SPEC-03 | Romaneio                           | A         | 01, 02          | ✅     |
| 2    | SPEC-05 | Rastreio, ETA e cerca eletrônica   | A         | 02              | ✅     |
| 2    | SPEC-08 | Notificações e link do motorista   | B         | 07, 09          | ✅     |
| 3    | SPEC-04 | Entregas e encerramento            | A         | 03              | ✅     |
| 3    | SPEC-10 | Saída do veículo                   | B         | 09, contrato C2 | ✅     |
| 4    | SPEC-11 | Fluxo ponta a ponta + demo         | A + B     | todas           | ⬜     |
| 5    | SPEC-12 | IA no sistema                      | a definir | 11              | ⏸️     |

### Linha do tempo

```
Fase 0  ██ juntos ─────────────────────────────────────────────
Fase 1  Dev A: 01 → 02            │ Dev B: 06 → 07 → 09
Fase 2  Dev A: 03 → 05            │ Dev B: 08
Fase 3  Dev A: 04                 │ Dev B: 10
Fase 4  ██ juntos: integrar contratos reais + demo ponta a ponta
Fase 5  IA (quando o time definir)
```

---

## 4. Contratos entre os dois devs

São os únicos pontos em que um módulo chama o outro. **Combinem a assinatura na Fase 0.** Durante o desenvolvimento, um contrato pode começar como **stub** (versão falsa que sempre retorna sucesso); o quadro abaixo registra o que já foi implementado.

| ID     | Função                                                          | Implementa | Usa   | Quando é chamada                                  |
| ------ | --------------------------------------------------------------- | ---------- | ----- | ------------------------------------------------- |
| **C1** | `alocarDoca(ticketId) → { docaId?, numeroDoca?, posicaoFila? }` | B          | A     | Cerca eletrônica marca a entrada da frota própria |
| **C2** | `romaneioLiberado(ticketId) → boolean`                          | A          | B     | Antes de liberar a doca / registrar a saída       |
| **C3** | `enviarLinkMotorista(ticketId, telefone) → { token }`           | B          | A     | Motorista da frota própria precisa saber a doca   |
| **C4** | `registrarEvento(ticketId, tipo, descricao, dados?)`            | A          | A + B | Toda mudança relevante (linha do tempo)           |
| **C5** | `atualizarStatusTicket(ticketId, novoStatus)`                   | A          | A + B | Validação centralizada das transições de status   |

### Situação dos contratos

| ID | Situação | Onde |
| -- | -------- | ---- |
| **C1** | ✅ implementado (SPEC-09) | `src/shared/contratos/index.ts` |
| **C2** | ✅ implementado (SPEC-03) | `src/shared/contratos/index.ts` |
| **C3** | ✅ implementado (SPEC-08) | `src/shared/contratos/index.ts` |
| **C4** | ✅ implementado (SPEC-01/02) | `src/shared/contratos/index.ts` |
| **C5** | ✅ implementado (SPEC-02) | `src/shared/contratos/index.ts` + tabela em `src/modules/tickets/tickets.transicoes.ts` |

> As assinaturas implementadas ganharam um último parâmetro **opcional** `db` (o `tx` de uma `prisma.$transaction`). Chamadas sem ele continuam funcionando.
> `C5` ficou `atualizarStatusTicket(ticketId, novoStatus, db?, motivo?)` e `novoStatus` agora é o enum `TicketStatus`.

---

## 4.1 Para o Dev B — o que o Dev A já mexeu na sua área

Atualizado em 18/11/2026, após SPEC-00 a 05 (A — todas concluídas) e SPEC-06 (B). Cada spec sua (07, 08, 09, 10) também tem um bloco **📍 Ponto de partida** dizendo o que já existe e o que falta.

**Ao puxar:** rode `npx prisma generate` (ver README).

### 1. C4 e C5 já funcionam — use na portaria e nas suas specs
- `registrarEvento(ticketId, tipo, descricao, dados?, tx?)` grava o `EventoTicket`. A portaria hoje faz `tx.eventoTicket.create` direto — funciona, mas prefira o C4.
- `atualizarStatusTicket(ticketId, novoStatus, tx?, motivo?)` valida a transição (422 se inválida, com a lista `permitidos`) e grava o evento `STATUS_ALTERADO`.
- **A portaria ainda faz `tx.ticket.update({ status })` direto, sem passar pela validação.** Nada quebra — a tabela já aceita os caminhos que ela usa —, mas troque para o C5 (`portaria.service.ts`, linhas com `tx.ticket.update`).
- A tabela de transições (`tickets.transicoes.ts`) foi montada a partir do PROJETO §6 **mais** os caminhos reais da portaria/cerca:
  - `CRIADO → NA_PORTARIA` (portaria) · `NA_PORTARIA → BLOQUEADO | AGUARDANDO_MOTORISTA` (risco síncrono, sem passar por `EM_ANALISE_RISCO`)
  - `NA_PORTARIA | EM_DESLOCAMENTO → AGUARDANDO_DOCA` (cerca, frota própria)
  - `BLOQUEADO → EM_ANALISE_RISCO | AGUARDANDO_MOTORISTA` (reanálise da SPEC-07)
  - `AGUARDANDO_MOTORISTA → AGUARDANDO_DOCA | EM_DOCA` · `AGUARDANDO_DOCA → EM_DOCA` · `EM_DOCA → LIBERADO_SAIDA` · `LIBERADO_SAIDA → EM_TRANSITO`
  - Se alguma spec sua precisar de outro caminho, **adicione na tabela** (é a fonte única) e avise.

### 2. C2 pronto para a SPEC-09 e SPEC-10
- `romaneioLiberado(ticketId, tx?)` → `true` só se o ticket **tem** romaneio e todos estão `LIBERADO`/`FINALIZADO`. Ticket sem romaneio → `false`.

### 3. SPEC-10: `registrarSaida()` provisória já existe — assuma ela
- Arquivo: `src/shared/saida.ts` → `registrarSaida(ticketId, origem: "PORTARIA" | "CERCA", tx?)`.
- Já faz: checa C2 (422 se falso) → C5 para `EM_TRANSITO` (exige ticket `LIBERADO_SAIDA`) → acesso `SAIU` + `saidaEm` → entregas `PROGRAMADA → EM_ROTA` → eventos `SAIDA_REGISTRADA`, `MONITORAMENTO_VIAGEM_INICIADO` e `MONITORAMENTO_RISCO_INICIADO`.
- **A cerca (SPEC-05) já chama essa função.** Na SPEC-10 basta criar a rota `POST /portaria/:acessoId/saida` chamando `registrarSaida(ticketId, "PORTARIA", tx)` — e ajustar o corpo da função se quiser (mantenha a assinatura).

### 4. SPEC-09 (docas): o que a cerca espera do C1
- Na entrada pela cerca, o ticket já vai para `AGUARDANDO_DOCA` **antes** de chamar `alocarDoca(ticketId)`. Se o C1 alocar uma doca na hora, ele deve mover o ticket para `EM_DOCA` (via C5) e criar a `AlocacaoDoca`.
- A cerca chama o C1 **fora** da transação; se ele lançar erro, vira o evento `FALHA_ALOCAR_DOCA` (a posição não é perdida).
- **Pendente:** `POST /tickets/:id/cancelar` tira o ticket da `FilaDoca`, mas **não libera a doca** se ele estava `EM_DOCA`. Exponha uma função de liberar doca (ex.: `liberarDocaDoTicket(ticketId, tx)`) e eu chamo no cancelamento — ou chame você mesmo.

### 5. SPEC-08 (notificações): o que a cerca espera do C3
- A cerca chama `enviarLinkMotorista(ticketId, telefone)` com o telefone do **motorista do acesso**. Frota própria só tem motorista se alguém informou o condutor; sem telefone, a cerca grava o evento `LINK_MOTORISTA_PENDENTE` e não chama o C3.

### 6. SPEC-07 (reanálise)
- O critério da SPEC-02 "ticket `BLOQUEADO` corrigido pelo ADM → pedir nova análise" depende da sua rota `POST /risco/acessos/:acessoId/analisar`. A transição `BLOQUEADO → EM_ANALISE_RISCO` (e `→ AGUARDANDO_MOTORISTA`) já está liberada no C5.

### 7. Outras coisas úteis que já existem
- `GET /tickets/:id` traz acessos, análises, alocações de doca, fila, romaneios, ocorrências e a linha do tempo — dá para usar para conferir os seus fluxos.
- `GET /painel` já lê `Doca` + `AlocacaoDoca` (aberta = `saidaEm: null`) + `FilaDoca` (ordenada por `tipo, posicao`). Se a SPEC-09 usar esses campos assim, o painel funciona sem mudar nada.
- Códigos legíveis: `src/shared/codigos.ts` (`TK-…`, `ROM-…`) com retry em criação simultânea (`comCodigoUnico`).
- **Seu `scripts/test-portaria.mjs` não é idempotente:** ele reaproveita o `TK-TESTE-PORTARIA`, que ficou com um acesso aberto `BLOQUEADO` de uma execução anterior, então a portaria devolve esse acesso e os passos de carreta/condutor respondem 422. A portaria em si está ok (testada com tickets novos: aprovado, bloqueado, frota própria + cerca, placa sem ticket). Sugestão: no início do script, fechar os acessos abertos do ticket de teste ou criar um ticket novo a cada execução.

---

## 5. Specs

### SPEC-00 — Fundação ✅

**Dono:** A + B · **Fase:** 0

**Objetivo:** deixar o projeto rodando com banco, padrões e dados de teste, para os dois trabalharem em paralelo.

**Critérios de aceite**

- QUANDO alguém clonar o repo e rodar os comandos do README ENTÃO o servidor DEVE subir conectado ao Neon.
- QUANDO a migration rodar ENTÃO todas as entidades de [`PROJETO.md §7`](./PROJETO.md#7-entidades-principais) DEVEM existir com seus enums de status.
- QUANDO o seed rodar ENTÃO DEVEM existir 10 docas (4 coleta, 6 recebimento), veículos próprios e terceiros (cavalos e carretas) e motoristas (incluindo 1 com CNH vencida e 1 com restrição).
- QUANDO uma requisição for inválida ENTÃO a API DEVE responder no formato de erro padrão.
- QUANDO acessar `/docs` ENTÃO o Swagger DEVE listar as rotas.

**Tarefas**

- [x] Criar projeto Node + TS + framework HTTP + Zod
- [x] Configurar Prisma + Neon (`DATABASE_URL` e `DIRECT_URL`)
- [x] Escrever `schema.prisma` (juntos) e rodar a primeira migration
- [x] Estrutura de pastas (`modules/`, `integrations/`, `shared/`)
- [x] Handler de erro padrão + Swagger
- [x] Combinar e criar os **stubs** dos contratos C1–C5 (`src/shared/contratos`)
- [x] Seed com dados de teste (script pronto em `scripts/seed.ts`; rodado após a primeira migration)
- [x] README com como rodar
- [x] 2–3 XMLs de exemplo em `scripts/xml/` (coleta, recebimento, transferência)

---

### SPEC-01 — Ingestão do XML e triagem ✅

**Dono:** A · **Fase:** 1 · **Raia:** 1

**Objetivo:** receber o XML da NF-e, extrair os dados e gerar o ticket automaticamente.

**Critérios de aceite**

- QUANDO um XML válido for enviado ENTÃO o sistema DEVE salvar a nota (chave, número, emitente, destinatário, volumes, peso, placa, CFOP) e criar um ticket `CRIADO` com `origem = AUTOMATICO`.
- QUANDO o CNPJ do CD for o emitente ENTÃO `tipoPatio` DEVE ser `COLETA`.
- QUANDO o CNPJ do CD for o destinatário ENTÃO `tipoPatio` DEVE ser `RECEBIMENTO`.
- QUANDO emitente e destinatário tiverem a mesma raiz de CNPJ ENTÃO `operacao` DEVE ser `TRANSFERENCIA`/`FILIAL`.
- QUANDO a placa da nota pertencer à frota própria ENTÃO `frota` DEVE ser `PROPRIA`; senão `TERCEIRA`.
- QUANDO a mesma chave de nota for enviada de novo ENTÃO o sistema DEVE responder `409` sem duplicar.
- QUANDO o XML for inválido ENTÃO o sistema DEVE responder `422` explicando o problema.
- QUANDO a triagem decidir ENTÃO o ticket DEVE guardar o **motivo** da decisão (ex.: "emitente = CNPJ do CD → COLETA").

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/nfe/xml` | Recebe o XML (texto ou arquivo) + `origemSistema` (SAP/TOTVS) |
| GET | `/nfe/:id` | Detalhe da nota |

**Tarefas**

- [x] Parser do XML (`fast-xml-parser`) → objeto tipado
- [x] Serviço de triagem (funções puras, fáceis de testar)
- [x] Upsert de clientes (emitente/destinatário)
- [x] Criar nota + ticket + evento `TICKET_CRIADO`
- [x] Testar com os 3 XMLs de exemplo (fictícios; repetir quando chegarem os XMLs reais)

⏸️ **Pendente com o time:** várias notas da mesma placa viram 1 ticket ou vários? (Por enquanto: **1 nota = 1 ticket**, com opção de anexar a um ticket existente via `ticketId`.)

---

### SPEC-02 — Tickets e Painel Central ✅

**Dono:** A · **Fase:** 1 · **Raia:** 2

**Objetivo:** dar ao colaborador logístico a visão e o controle dos tickets.

**Critérios de aceite**

- QUANDO o colaborador criar um ticket manual ENTÃO ele DEVE nascer com `origem = MANUAL`.
- QUANDO listar tickets ENTÃO DEVE ser possível filtrar por status, frota e tipo no pátio.
- QUANDO abrir um ticket ENTÃO DEVE vir a linha do tempo (eventos), notas, acessos, análises e romaneio.
- QUANDO uma transição de status for inválida (ex.: `CRIADO → EM_TRANSITO`) ENTÃO o sistema DEVE recusar com `422`.
- QUANDO um ticket `BLOQUEADO` for corrigido pelo ADM ENTÃO DEVE ser possível pedir nova análise de risco.
- QUANDO consultar o painel ENTÃO o sistema DEVE devolver contagem por status, situação das 10 docas, fila e ocorrências abertas.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/tickets` | Ticket manual (solicitação de frete) |
| GET | `/tickets` | Lista com filtros |
| GET | `/tickets/:id` | Detalhe + linha do tempo |
| POST | `/tickets/:id/cancelar` | Cancela |
| GET | `/painel` | Resumo para o Painel Central |

**Tarefas**

- [x] CRUD do ticket manual
- [x] Implementar **C4** (`registrarEvento`) e **C5** (`atualizarStatusTicket` com tabela de transições em `src/modules/tickets/tickets.transicoes.ts`)
- [x] Endpoint de detalhe com includes
- [x] Endpoint `/painel`

---

### SPEC-03 — Romaneio ✅

**Dono:** A · **Fase:** 2

**Objetivo:** organizar as notas do caminhão, conferir na doca e liberar para saída.

**Status:** `EM_MONTAGEM → CONFERIDO → LIBERADO → FINALIZADO`

**Critérios de aceite**

- QUANDO um romaneio for criado para um ticket ENTÃO ele DEVE agrupar as notas do ticket e calcular totais de volumes e peso.
- QUANDO a conferência informar volumes iguais aos registrados ENTÃO o status DEVE ir para `CONFERIDO`.
- QUANDO houver divergência ENTÃO o sistema DEVE registrar uma `Ocorrencia` do tipo `DIVERGENCIA` e só conferir se `aceitarDivergencia = true`.
- QUANDO liberar um romaneio não conferido ENTÃO o sistema DEVE recusar com `422`.
- QUANDO liberar ENTÃO o sistema DEVE gerar uma **entrega por nota**, com sequência de atendimento.
- QUANDO `romaneioLiberado(ticketId)` (**C2**) for chamado ENTÃO DEVE retornar `true` só se todos os romaneios do ticket estiverem `LIBERADO` ou `FINALIZADO`.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/romaneios` | Cria a partir de um ticket (ou lista de notas) |
| POST | `/romaneios/:id/notas` | Adiciona notas (só em montagem) |
| POST | `/romaneios/:id/conferir` | Volumes conferidos por nota |
| POST | `/romaneios/:id/liberar` | Libera e gera entregas |
| GET | `/romaneios/:id` | Detalhe com notas e entregas |

**Tarefas**

- [x] Criação + totais
- [x] Conferência com divergência
- [x] Liberação + geração de entregas
- [x] Implementar **C2** (substituir o stub)

---

### SPEC-04 — Entregas e encerramento ✅

**Dono:** A · **Fase:** 3

**Objetivo:** registrar cada entrega e encerrar o ticket quando tudo for entregue.

**Status da entrega:** `PROGRAMADA → EM_ROTA → ENTREGUE` (ou `PARCIAL`, `RECUSADA`, `DESTINATARIO_AUSENTE`, `INSUCESSO`)

**Critérios de aceite**

- QUANDO o veículo sair ENTÃO as entregas do romaneio DEVEM ir para `EM_ROTA`.
- QUANDO uma entrega for baixada ENTÃO DEVE registrar recebedor, documento, volumes entregues, data e comprovante (URL de foto/assinatura).
- QUANDO volumes entregues < previstos ENTÃO o status DEVE ser `PARCIAL` e gerar ocorrência.
- QUANDO todas as entregas do romaneio tiverem resultado final ENTÃO o romaneio DEVE ir para `FINALIZADO`.
- QUANDO todos os romaneios do ticket estiverem finalizados ENTÃO o ticket DEVE ir para `ENCERRADO`.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/entregas?romaneioId=` | Lista entregas |
| POST | `/entregas/:id/baixa` | Registra o resultado + POD |

**Tarefas**

- [x] Baixa da entrega com validação
- [x] Finalização automática do romaneio
- [x] Encerramento automático do ticket

**Como ficou a baixa** (`POST /entregas/:id/baixa`, só para entrega `EM_ROTA`):
- Entrega realizada: `{ volumesEntregues, recebedorNome, recebedorDoc, comprovanteUrl, baixadaEm? }` → `ENTREGUE`, ou `PARCIAL` + ocorrência `DIVERGENCIA` se volumes < previstos.
- Não realizada: `{ resultado: "RECUSADA" | "DESTINATARIO_AUSENTE" | "INSUCESSO", motivo }`.
- `GET /entregas` aceita `romaneioId` **ou** `ticketId` (e `status`).
- As entregas vão para `EM_ROTA` dentro da `registrarSaida()` (`src/shared/saida.ts`).

⏸️ **Pendente com o time:** quem baixa — motorista pelo link ou painel? (A rota serve para os dois; se for pelo link, a SPEC-08 pode expor uma rota do link chamando `baixarEntrega()` de `src/modules/entregas/entregas.service.ts`.)

---

### SPEC-05 — Rastreio, ETA e cerca eletrônica ✅

**Dono:** A · **Fase:** 2 · **Raia:** 3

**Objetivo:** simular o rastreador da frota própria, calcular ETA e marcar entrada/saída pela cerca.

**Critérios de aceite**

- QUANDO uma posição for recebida para um veículo com ticket aberto ENTÃO o sistema DEVE salvar a posição e recalcular o **ETA** (distância até o CD ÷ velocidade).
- QUANDO a primeira posição chegar com o ticket `CRIADO` ENTÃO o status DEVE ir para `EM_DESLOCAMENTO`.
- QUANDO o novo ETA atrasar mais que X minutos em relação ao anterior ENTÃO o sistema DEVE gerar ocorrência `ATRASO`.
- QUANDO o veículo próprio **entrar** no raio da cerca ENTÃO o sistema DEVE marcar entrada automática e chamar **C1** (`alocarDoca`) e **C3** (`enviarLinkMotorista`).
- QUANDO o veículo próprio **sair** do raio da cerca ENTÃO o sistema DEVE registrar a saída (mesma regra da SPEC-10: só com romaneio liberado).
- QUANDO o veículo estiver `EM_TRANSITO` ENTÃO as posições DEVEM ser guardadas para o monitoramento da viagem.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/rastreio/posicao` | `{ placa, lat, lng, velocidade? }` |
| GET | `/tickets/:id/eta` | ETA atual e distância |
| GET | `/tickets/:id/posicoes` | Trajeto |

**Tarefas**

- [x] Cálculo de distância (haversine) + ETA
- [x] Detecção de entrada/saída da cerca (raio configurável — `CERCA_RAIO_KM`)
- [x] Script `scripts/simular-rastreio` que envia posições se aproximando do CD (`npm run simular:rastreio -- PLACA`)
- [x] Integração com C1 e C3

---

### SPEC-06 — Portaria (entrada) ✅

**Dono:** B · **Fase:** 1 · **Raia:** 4

**Objetivo:** registrar a chegada do veículo terceiro e coletar os dados para a análise de risco.

**Status do acesso:** `AGUARDANDO_DADOS → EM_ANALISE → LINK_ENVIADO → LIBERADO → SAIU` (ou `BLOQUEADO`)

**Critérios de aceite**

- QUANDO o porteiro lançar uma placa ENTÃO o sistema DEVE buscar o veículo e o ticket aberto correspondente.
- QUANDO a placa não estiver em nenhum ticket aberto ENTÃO o sistema DEVE bloquear, notificar o ADM e responder informando o bloqueio.
- QUANDO o veículo for frota própria ENTÃO a portaria DEVE apenas registrar a entrada (a regra da cerca fica na SPEC-05).
- QUANDO o veículo for cavalo mecânico ENTÃO o sistema DEVE indicar como próximo passo informar a carreta (opcional: "só cavalo").
- QUANDO o porteiro informar CPF e telefone do condutor ENTÃO o sistema DEVE cadastrar/atualizar o motorista e disparar a análise de risco (SPEC-07).
- QUANDO a placa/motorista não tiver cadastro ENTÃO o sistema DEVE cadastrar na hora.
- QUANDO cada passo for concluído ENTÃO o ticket DEVE registrar o evento correspondente.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/portaria/entrada` | `{ placa, ticketId? }` → devolve `proximoPasso` |
| PATCH | `/portaria/:acessoId/carreta` | `{ placa }` ou `{ somenteCavalo: true }` |
| PATCH | `/portaria/:acessoId/condutor` | `{ nome, cpf, telefone }` → dispara risco |
| GET | `/portaria/acessos?status=` | Veículos no pátio / aguardando |

**Tarefas**

- [x] Entrada com consulta por placa
- [x] Bloqueio por placa sem ticket
- [x] Carreta / só cavalo
- [x] Condutor + chamada da análise de risco

---

### SPEC-07 — Análise de risco (simulada) ✅

**Dono:** B · **Fase:** 1 · **Raia:** 5

**Objetivo:** aprovar ou reprovar o conjunto cavalo + carreta + condutor com regras simuladas.

**Critérios de aceite**

- QUANDO a análise rodar ENTÃO DEVE avaliar cavalo, carreta (se houver) e condutor e gerar `score` (0–100) e lista de **motivos**.
- QUANDO a CNH estiver vencida ou ausente ENTÃO DEVE reprovar.
- QUANDO veículo ou motorista tiver restrição ENTÃO DEVE reprovar.
- QUANDO a placa da nota for diferente da placa na portaria ENTÃO DEVE somar risco (alerta) — reprova se passar do limite.
- QUANDO reprovar ENTÃO o acesso e o ticket DEVEM ir para `BLOQUEADO`, gerar ocorrência `RISCO`, notificar o ADM e o ticket DEVE voltar ao Painel Central.
- QUANDO aprovar ENTÃO DEVE emitir a liberação e acionar o envio do link (SPEC-08).
- QUANDO o ADM trocar motorista/carreta ENTÃO DEVE ser possível **reanalisar**, mantendo o histórico das análises anteriores.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/risco/acessos/:acessoId/analisar` | Roda (ou re-roda) a análise |
| GET | `/risco/acessos/:acessoId` | Histórico de análises |

**Tarefas**

- [x] Serviço de regras isolado em `integrations/risco` (trocável pela gerenciadora real)
- [x] Fluxo de reprovação + notificação ADM
- [x] Reanálise com histórico

> **📍 Ponto de partida (Dev B)** — boa parte já existe, feita junto com a SPEC-06:
> - ✅ Regras simuladas em `src/integrations/risco/risco.service.ts` (`analisarRiscoSimulado`): CNH ausente/vencida, restrições, placa divergente (−20), reprova com score < 70.
> - ✅ A portaria (`PATCH /portaria/:acessoId/condutor`) já roda a análise, grava `AnaliseRisco` e, na reprovação, põe acesso/ticket em `BLOQUEADO` + ocorrência `RISCO` + `Notificacao` ao ADM. O `GET /painel` já mostra a ocorrência.
> - ⬜ **Falta:** `POST /risco/acessos/:acessoId/analisar` (reanálise) e `GET /risco/acessos/:acessoId` (histórico). Sugestão: extrair da portaria uma `analisarAcesso(acessoId, tx)` e usar nas duas.
> - ⬜ **Falta:** usar o C5 `atualizarStatusTicket(...)` na reanálise (`BLOQUEADO → EM_ANALISE_RISCO → AGUARDANDO_MOTORISTA | BLOQUEADO` já liberado). Ao aprovar, marcar a ocorrência `RISCO` como `resolvida: true`.
> - ✅ Ao aprovar, o C3 (SPEC-08) gera e envia o link com token ao motorista.
> - Troca de motorista/carreta: os `PATCH /portaria/:acessoId/carreta|condutor` recusam acesso `BLOQUEADO` (422). Libere para `BLOQUEADO` ou faça a troca na rota de reanálise.

⏸️ **Pendente com o time:** critérios reais de risco. (Por enquanto: as regras acima.)

---

### SPEC-08 — Notificações e link do motorista ✅

**Dono:** B · **Fase:** 2

**Objetivo:** avisar o motorista (simulado) e permitir que ele confirme e receba a doca.

**Critérios de aceite**

- QUANDO uma notificação for enviada ENTÃO o sistema DEVE gravar na tabela `Notificacao` (canal, destino, mensagem) e logar no console.
- QUANDO o risco aprovar ENTÃO o sistema DEVE gerar um **token único** com validade e enviar o link por SMS e WhatsApp.
- QUANDO o motorista abrir o link ENTÃO DEVE ver os dados do ticket e do veículo.
- QUANDO o motorista confirmar ENTÃO o sistema DEVE chamar a alocação de doca e devolver a **doca** ou a **posição na fila**.
- QUANDO o token estiver expirado ou já usado ENTÃO o sistema DEVE recusar com `410`/`409`.
- QUANDO **C3** for chamada pela frota própria ENTÃO o mesmo link DEVE ser enviado.
- QUANDO o motorista terceiro enviar localização pelo link durante a viagem ENTÃO o sistema DEVE registrá-la como posição (monitoramento).

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/motorista/link/:token` | Dados para a tela do link |
| POST | `/motorista/link/:token/confirmar` | Confirma e recebe a doca |
| POST | `/motorista/link/:token/localizacao` | Localização durante a viagem |
| GET | `/notificacoes` | Log das notificações simuladas |

**Tarefas**

- [x] Serviço `integrations/notificacao` (simulado, trocável por Twilio/Z-API)
- [x] Geração e validação de token
- [x] Confirmação → alocação de doca
- [x] Implementar **C3**

> **📍 Ponto de partida (Dev B)**
> - O schema já tem: `AcessoPortaria.token` (`@unique`), `tokenValidade`, `tokenUsado` e a tabela `Notificacao`.
> - **C3** `enviarLinkMotorista(ticketId, telefone)` está implementado em `src/shared/contratos/index.ts`; envia o mesmo link válido por até 12 horas via SMS e WhatsApp simulados.
> - A cerca (SPEC-05) e a aprovação de risco (SPEC-07) chamam o C3. Sem telefone na cerca, é gravado `LINK_MOTORISTA_PENDENTE`.
> - `POST /motorista/link/:token/confirmar` chama o **C1** `alocarDoca(ticketId)`.
> - `POST /motorista/link/:token/localizacao` reaproveita `receberPosicao()` de `src/modules/rastreio/rastreio.service.ts` após validar acesso, frota, placa e viagem.
> - Rotas disponíveis: `GET /motorista/link/:token`, `POST /motorista/link/:token/confirmar`, `POST /motorista/link/:token/localizacao` e `GET /notificacoes`.
> - Eventos: use o **C4** `registrarEvento(...)`.

**Validade do link:** 12 horas.

---

### SPEC-09 — Docas e fila ✅

**Dono:** B · **Fase:** 1 · **Raia:** 6

**Objetivo:** alocar doca do pool certo, gerenciar a fila e liberar.

**Critérios de aceite**

- QUANDO o ticket for `COLETA` ENTÃO DEVE alocar uma doca do pool de **4 docas de coleta**; QUANDO for `RECEBIMENTO`, do pool de **6 de recebimento**.
- QUANDO houver doca livre ENTÃO DEVE alocar, marcar a doca `OCUPADA` e o ticket `EM_DOCA`.
- QUANDO não houver doca livre ENTÃO o ticket DEVE entrar na **fila** daquele pool e ficar `AGUARDANDO_DOCA`, retornando a posição.
- QUANDO dois pedidos chegarem ao mesmo tempo ENTÃO NÃO PODE haver duas alocações na mesma doca (usar transação com lock).
- QUANDO uma doca for liberada ENTÃO o **primeiro da fila do mesmo pool** DEVE ser alocado automaticamente.
- QUANDO a doca for liberada ENTÃO **C2** (`romaneioLiberado`) DEVE retornar `true`; senão recusar com `422`.
- QUANDO uma doca estiver em `MANUTENCAO` ENTÃO ela NÃO PODE ser alocada.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/docas` | Situação das 10 docas |
| POST | `/docas/alocar` | `{ ticketId }` → doca ou posição na fila |
| POST | `/docas/:id/liberar` | Libera e puxa o próximo da fila |
| PATCH | `/docas/:id/status` | Manutenção / livre |
| GET | `/docas/fila` | Fila por pool |

**Tarefas**

- [x] Alocação com lock (`SELECT ... FOR UPDATE SKIP LOCKED` ou transação serializável)
- [x] Fila por pool
- [x] Liberação + próximo da fila
- [x] Implementar **C1** (substituir o stub)

> **📍 Ponto de partida (Dev B)**
> - Seed pronto: 10 docas (1–4 `COLETA`, 5–10 `RECEBIMENTO`), todas `LIVRE`. Tabelas `AlocacaoDoca` (aberta = `saidaEm: null`, unique `ticketId+saidaEm`) e `FilaDoca` (unique `ticketId+tipo`).
> - **C1** `alocarDoca(ticketId)` ainda é **stub** (retorna `{ posicaoFila: 1 }`). Troque o corpo mantendo o retorno `{ docaId?, numeroDoca?, posicaoFila? }`; o pool vem de `ticket.tipoPatio`.
> - **Quem já chama o C1:** a cerca (SPEC-05) — o ticket já chega em `AGUARDANDO_DOCA`. Se alocar na hora, mova para `EM_DOCA` via C5 `atualizarStatusTicket(ticketId, "EM_DOCA", tx)`. A cerca chama **fora** de transação; erro vira evento `FALHA_ALOCAR_DOCA`.
> - Status do ticket: use o C5. Liberar a doca = `EM_DOCA → LIBERADO_SAIDA` (já liberado na tabela). Na liberação, cheque o **C2** `romaneioLiberado(ticketId, tx)` (pronto).
> - O `GET /painel` já lê `Doca` + `AlocacaoDoca` aberta + `FilaDoca` (ordem `tipo, posicao`) — usando esses campos assim, o painel funciona sem mudança.
> - **Pendente com o Dev A:** `POST /tickets/:id/cancelar` tira da fila mas **não libera a doca**. Exponha `liberarDocaDoTicket(ticketId, tx)` e o Dev A chama no cancelamento.

⏸️ **Pendente com o time:** prioridade na fila. (Por enquanto: ordem de chegada.)

---

### SPEC-10 — Saída do veículo ✅

**Dono:** B · **Fase:** 3 · **Raia:** 4

**Objetivo:** registrar a saída e iniciar os monitoramentos.

**Critérios de aceite**

- QUANDO o porteiro der baixa na saída de um terceiro ENTÃO o sistema DEVE verificar **C2**; se `false`, recusar com `422`.
- QUANDO a saída for registrada ENTÃO o acesso DEVE ir para `SAIU`, o ticket para `EM_TRANSITO` e as entregas para `EM_ROTA`.
- QUANDO a saída for registrada ENTÃO o sistema DEVE marcar o início do monitoramento da viagem e do **monitoramento de risco em rota** (evento no ticket).
- QUANDO a saída for pela cerca (frota própria, SPEC-05) ENTÃO DEVE usar a mesma função de saída.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|
| POST | `/portaria/:acessoId/saida` | Baixa do porteiro |

**Tarefas**

- [x] Função única `registrarSaida()` usada pela portaria e pela cerca
- [x] Atualização de ticket, acesso e entregas
- [x] Eventos de início dos monitoramentos

> **📍 Ponto de partida (Dev B)** — a maior parte está pronta, falta a rota:
> - `src/shared/saida.ts` → `registrarSaida(ticketId, "PORTARIA" | "CERCA", tx?)`, criada pelo Dev A para a cerca. Já faz: C2 (422 se falso) → C5 `EM_TRANSITO` (exige `LIBERADO_SAIDA`) → acesso `SAIU` + `saidaEm` → entregas `PROGRAMADA → EM_ROTA` → eventos `SAIDA_REGISTRADA`, `MONITORAMENTO_VIAGEM_INICIADO`, `MONITORAMENTO_RISCO_INICIADO`.
> - A **cerca já usa** essa função e foi testada ponta a ponta (saída → entregas → encerramento na SPEC-04).
> - `POST /portaria/:acessoId/saida` chama `prisma.$transaction(tx => registrarSaida(acesso.ticketId, "PORTARIA", tx))`.
> - Pré-requisito: o ticket precisa estar `LIBERADO_SAIDA` (vem da liberação da doca, SPEC-09).

---

### SPEC-11 — Fluxo ponta a ponta + demo ⬜

**Dono:** A + B · **Fase:** 4

**Objetivo:** provar que o sistema inteiro funciona junto.

**Critérios de aceite**

- QUANDO todos os stubs forem trocados pelas implementações reais ENTÃO o fluxo DEVE rodar sem erro.
- QUANDO rodar o roteiro de demo ENTÃO DEVEM funcionar estes cenários:
  1. **Terceiro aprovado**: XML → ticket → portaria → carreta → condutor → risco aprovado → link → doca → romaneio conferido/liberado → saída → entregas → encerrado.
  2. **Terceiro reprovado**: CNH vencida → bloqueado → volta ao painel → troca de motorista → reanálise aprovada.
  3. **Frota própria**: XML → posições simuladas → ETA → cerca marca entrada → doca → saída pela cerca.
  4. **Fila**: ocupar as 4 docas de coleta → 5º caminhão vai para a fila → liberar uma doca → 5º é alocado.
  5. **Placa sem ticket**: bloqueio + notificação ADM.
- QUANDO o front chegar ENTÃO o Swagger DEVE estar atualizado com todos os contratos.

**Tarefas**

- [x] Remover stubs (C1–C5 todos reais)
- [x] Arquivo `.http` (ou coleção Postman/Insomnia) com os 5 cenários → `docs/demo.http`
- [x] Script de demo + seed limpo → `npm run demo` e `npm run demo:reset -- --confirmar`
- [ ] Deploy (Railway/Render) apontando para o Neon — passos no README; falta criar o serviço na conta do time
- [x] Swagger com todos os contratos (34 rotas)

**Validação (23/11/2026):** `npm run demo` passou nos 5 cenários contra o Neon, sem erros no log. Durante a integração foram corrigidos: retry de conflito na alocação de docas (500 em pedidos simultâneos), timeout das transações (500 na reanálise), renumeração da fila ao cancelar e localização do link gravada no ticket certo.

---

### SPEC-12 — IA no sistema ⏸️

**Dono:** a definir · **Fase:** 5

**Bloqueada:** aguardando o time definir **onde a IA entra e o que ela faz**.

Ideias que o backend já suporta graças à linha do tempo (`EventoTicket`) e aos motivos de triagem/risco:

- Triagem do XML assistida por IA (casos ambíguos).
- Explicação em linguagem natural do motivo de reprovação no risco.
- Previsão de atraso com base no histórico de ETA.
- Sugestão/otimização de alocação de doca.
- Resumo diário da operação para o ADM.
- Agente que opera o fluxo sozinho (ex.: reanalisa, realoca, avisa).

Quando o time decidir, escrever a spec seguindo o modelo abaixo **antes** de codar.

---

## 6. Modelo para novas specs

Copie este bloco ao criar uma spec nova ou ao detalhar uma existente:

```markdown
### SPEC-XX — Título ⬜

**Dono:** A/B · **Fase:** N · **Raia:** N · **Depende de:** SPEC-YY

**Objetivo:** uma frase dizendo o problema que resolve.

**Status (se houver):** `A → B → C`

**Critérios de aceite**

- QUANDO <situação> ENTÃO o sistema DEVE <comportamento>.
- QUANDO <situação de erro> ENTÃO o sistema DEVE <resposta + código HTTP>.

**Contrato**
| Método | Rota | Descrição |
|---|---|---|

**Tarefas**

- [ ] ...

⏸️ **Pendente com o time:** ... (premissa usada até a resposta)
```

---

## 7. Checklist de "pronto" (Definition of Done)

Uma spec só vira ✅ quando:

- [ ] Todos os critérios de aceite foram testados e passam.
- [ ] Erros devolvem o formato padrão com o código HTTP correto.
- [ ] Eventos relevantes estão sendo gravados na linha do tempo do ticket.
- [ ] Rotas aparecem no Swagger.
- [ ] A outra pessoa revisou o PR.
- [ ] `PROJETO.md` e esta spec estão atualizados se alguma regra mudou.
