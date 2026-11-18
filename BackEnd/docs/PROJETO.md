# ARGOS IA LOGISTIC — Backend

> Documento de referência do projeto. Explica **o que** o sistema faz, **como** a operação funciona e **quais regras** o backend segue.
> O plano de execução (quem faz o quê e em que ordem) está em [`ROADMAP.md`](./ROADMAP.md).

---

## 1. O que é o sistema

O ARGOS é um sistema de gestão logística para um **Centro de Distribuição (CD)** com **10 docas**. Ele acompanha o caminhão do começo ao fim:

```
Nota fiscal (XML) → Ticket → Portaria → Análise de risco → Doca → Romaneio → Saída → Viagem → Entregas → Encerramento
```

A ideia central: **o sistema parte da nota fiscal**. Quando o XML da NF-e chega (SAP/TOTVS), o sistema identifica sozinho o tipo de frota e de operação e cria um **ticket**. A partir daí, cada etapa atualiza esse ticket até ele ser encerrado.

### Escopo deste repositório

- **Backend apenas** — API REST, sem depender do front por enquanto.
- **Integrações simuladas** (SAP/TOTVS, WhatsApp/SMS, gerenciadora de risco, rastreador).
- **IA**: ainda em definição pelo time (ver [§9](#9-pendências)).

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js + TypeScript |
| API | REST (Express ou Fastify) |
| Validação | Zod |
| ORM | Prisma |
| Banco | PostgreSQL no Neon |
| Documentação da API | OpenAPI / Swagger |

---

## 3. Glossário

| Termo | O que é |
|---|---|
| **NF-e / XML** | Nota fiscal eletrônica. O XML traz emitente, destinatário, volumes, peso e transporte (placa). É a entrada do sistema. |
| **Ticket** | O "card" de uma viagem/operação no Painel Central. Tudo gira em torno dele. |
| **Frota própria** | Veículo da empresa ("da casa"). Tem rastreador. |
| **Frota terceira** | Veículo de transportadora contratada. Não tem rastreador. |
| **Cavalo mecânico** | O caminhão que puxa. |
| **Carreta** | A parte que leva a carga, engatada no cavalo. Tem placa própria. |
| **Cerca eletrônica (geofence)** | Área virtual em volta do CD. Quando o rastreador entra/sai dela, o sistema marca entrada/saída automaticamente. |
| **ETA** | Estimativa de chegada (distância ÷ velocidade). |
| **Doca** | Ponto do CD onde o caminhão encosta para carregar ou descarregar. |
| **Coleta (no pátio)** | Caminhão vem **carregar** mercadoria que sai do CD. Pool de **4 docas**. |
| **Recebimento** | Caminhão vem **descarregar** mercadoria que chega ao CD. Pool de **6 docas**. |
| **Romaneio** | A lista do que vai no caminhão: agrupa as notas fiscais, com volumes, peso, destinos e ordem de entrega. Documento operacional (não fiscal), usado para conferência e controle. |
| **Entrega** | Cada parada onde a carga é recebida. Registra quem recebeu, quantidade e comprovante (POD). |
| **POD** | *Proof of Delivery* — comprovante de entrega (foto, assinatura, nome do recebedor). |

> ⚠️ "Coleta" tem dois sentidos no material do time. No **guia**, é buscar mercadoria no cliente. No **fluxograma**, "doca de coleta" é onde o caminhão **carrega** no CD. No código, usamos o sentido do fluxograma.

---

## 4. Fluxo da operação (as 6 raias)

### Raia 1 — Recebimento de XML e triagem
1. XML da NF-e chega (SAP ou TOTVS → **simulado por upload**).
2. Motor de triagem lê o XML e identifica:
   - **Frota**: própria ou terceira (pela placa/transportadora).
   - **Operação**: transferência, distribuição ou filial.
   - **Tipo no pátio**: coleta ou recebimento (ver regra em [§5.1](#51-triagem-do-xml)).
3. **Ticket gerado automaticamente.**

### Raia 2 — Painel Central (colaborador logístico)
- Recebe os tickets automáticos.
- O colaborador também pode **criar ticket manual** (solicitação de frete sem nota).
- Recebe de volta os tickets **bloqueados** pelo risco para resolver.
- Decide o caminho pelo **tipo de frota**.

### Raia 3 — Logística da viagem
- **Frota própria**: localização em tempo real → cálculo de ETA → chega na portaria.
- **Após a saída** (qualquer frota): monitoramento da viagem → encerramento do ticket.

### Raia 4 — Portaria
- **Própria**: cerca eletrônica marca a **entrada automática** → vai direto para as docas (sem análise de risco).
- **Terceira**:
  1. Porteiro lança a **placa** e consulta o veículo/ticket.
  2. É cavalo mecânico? Se **com carreta**, informa a placa da carreta.
  3. Coleta **CPF e telefone** do condutor.
  4. Envia para **análise de risco**.
  5. Se aprovado: dispara **SMS + WhatsApp com link**; o condutor finaliza no link e recebe a doca.
- **Saída**: própria pela cerca eletrônica; terceira por **baixa do porteiro**.

### Raia 5 — Gerenciamento de risco
- Analisa **cavalo, carreta e condutor**.
- **Reprovado** → bloqueia a entrada, notifica o ADM e o ticket **volta para o Painel Central**.
- **Aprovado** → emite a liberação.
- Após a saída: **monitoramento preventivo de risco em rota** (pode interferir no encerramento).

### Raia 6 — Docas (10 docas)
1. Operação no pátio? **Coleta** → pool de 4 docas. **Recebimento** → pool de 6 docas.
2. Aloca uma doca livre (ou coloca na **fila**).
3. Carga/descarga na doca + **conferência do romaneio**.
4. Libera a doca no painel → registro de saída.

---

## 5. Regras de negócio

### 5.1 Triagem do XML
| Situação | Resultado |
|---|---|
| CNPJ do CD é o **emitente** (`emit/CNPJ`) | Mercadoria sai → **COLETA** (caminhão carrega) |
| CNPJ do CD é o **destinatário** (`dest/CNPJ`) | Mercadoria chega → **RECEBIMENTO** (caminhão descarrega) |
| Emitente e destinatário com a **mesma raiz de CNPJ** (8 primeiros dígitos) | Operação de **transferência/filial**; o tipo no pátio é decidido comparando com o **CNPJ completo do CD** |
| Placa (`transp/veicTransp/placa`) cadastrada como frota própria | **Frota própria**; senão **terceira** |

Campos do XML usados: `emit/CNPJ`, `dest/CNPJ`, `ide/tpNF`, `det/prod/CFOP`, `transp` (transportadora, placa, volumes, peso).

### 5.2 Portaria
- Placa **não encontrada** em nenhum ticket aberto → **bloqueia e notifica o ADM**.
- Condutor: o porteiro coleta **CPF + telefone** (o CPF é necessário para a análise de risco).
- Veículo/motorista sem cadastro pode ser cadastrado na hora.

### 5.3 Análise de risco (simulada)
- Regras próprias, sem gerenciadora real. Exemplos: CNH vencida, motorista/veículo marcado com restrição, placa diferente da informada na nota.
- **Reprovado** → acesso bloqueado + notificação ao ADM + ticket volta ao Painel Central.
- O ADM pode **trocar motorista ou carreta e pedir nova análise**, ou cancelar.
- Cada análise fica registrada com os **motivos** (histórico).

### 5.4 Link do motorista
- Enviado (simulado) por SMS e WhatsApp após aprovação no risco.
- Também enviado ao **motorista da frota própria**, para ele saber a doca.
- O condutor confirma no link e recebe a doca (ou a posição na fila).
- Para o **terceiro**, o link também serve para enviar localização durante a viagem (monitoramento).

### 5.5 Docas e fila
- Pools separados: **4 de coleta** e **6 de recebimento**.
- Sem doca livre no pool → **fila de espera** (ordem de chegada).
- Ao liberar uma doca, o **primeiro da fila daquele pool** é alocado automaticamente.
- A alocação precisa ser segura contra concorrência (dois caminhões não podem pegar a mesma doca).

### 5.6 Romaneio
| Status | Quando |
|---|---|
| `EM_MONTAGEM` | Ao criar o ticket, com as notas fiscais dele |
| `CONFERIDO` | Na doca, após conferir volumes físicos × registrados (divergência gera ocorrência) |
| `LIBERADO` | Antes de liberar a doca; gera as **entregas** (uma por nota, com sequência) |
| `FINALIZADO` | Quando todas as entregas foram baixadas |

**Regra-chave: o veículo só sai com o romaneio `LIBERADO`.**

### 5.7 Saída, viagem e encerramento
- Saída: própria pela cerca eletrônica; terceira por baixa do porteiro.
- A saída inicia o **monitoramento da viagem** e o **monitoramento de risco em rota**.
- O ticket é **encerrado quando todas as entregas do romaneio forem baixadas**.

### 5.8 Integrações simuladas
| Integração real | Simulação |
|---|---|
| SAP / TOTVS | Endpoint de upload do XML |
| SMS / WhatsApp | Grava na tabela `notificacao` e loga no console |
| Gerenciadora de risco | Regras próprias no serviço de risco |
| Rastreador / cerca | Endpoint que recebe posições + script que envia posições falsas |

Cada integração fica **isolada em um serviço próprio**, para poder trocar pela real depois sem mexer no resto.

---

## 6. Status do ticket

```
CRIADO
  ├─(frota própria)→ EM_DESLOCAMENTO ─→ NA_PORTARIA
  └─(terceira)────────────────────────→ NA_PORTARIA
NA_PORTARIA ─(terceira)→ EM_ANALISE_RISCO ─┬─ reprovado → BLOQUEADO ─→ (ADM corrige) → EM_ANALISE_RISCO
                                            └─ aprovado  → AGUARDANDO_MOTORISTA
NA_PORTARIA ─(própria)→ AGUARDANDO_DOCA
AGUARDANDO_MOTORISTA ─→ AGUARDANDO_DOCA (fila) ─→ EM_DOCA
EM_DOCA ─→ LIBERADO_SAIDA ─→ EM_TRANSITO ─→ ENCERRADO
(qualquer estado aberto) ─→ CANCELADO
```

Outros status (coleta, entrega, doca, acesso) estão no [`ROADMAP.md`](./ROADMAP.md), dentro de cada spec.

---

## 7. Entidades principais

| Entidade | Para que serve |
|---|---|
| `Cliente` | Emitentes e destinatários das notas |
| `NotaFiscal` | Dados extraídos do XML |
| `Ticket` | A viagem/operação; centro do sistema |
| `EventoTicket` | Linha do tempo de tudo que aconteceu no ticket |
| `Veiculo` | Cavalo, carreta etc.; frota própria ou terceira |
| `Motorista` | Condutor (CPF, telefone, CNH) |
| `AcessoPortaria` | Entrada/saída de um conjunto cavalo + carreta + condutor |
| `AnaliseRisco` | Resultado, score e motivos |
| `Doca` | As 10 docas e seus status |
| `AlocacaoDoca` / `FilaDoca` | Uso da doca e fila de espera |
| `Romaneio` | Agrupa as notas do caminhão |
| `Entrega` | Cada parada/recebimento, com POD |
| `PosicaoVeiculo` | Posições do rastreio (simulado) |
| `Ocorrencia` | Divergências, atrasos, avarias, risco |
| `Notificacao` | Log de SMS/WhatsApp simulados |

---

## 8. Convenções

- **Idioma**: nomes de domínio em português (`ticket`, `romaneio`, `doca`), sem acento no código.
- **Status**: enums em `MAIUSCULO_COM_UNDERSCORE`, definidos uma única vez no schema.
- **Códigos legíveis**: `TK-2026-00001`, `ROM-2026-00001`, `EN-0001`.
- **Erros**: formato único `{ "erro": "mensagem", "detalhes": ... }` com status HTTP correto (404, 409, 422).
- **Todo evento relevante** grava um `EventoTicket` (vira a linha do tempo do painel e serve de base para a IA).
- **Pastas sugeridas**:
  ```
  BackEnd/
  ├── docs/            ← este documento, roadmap e specs
  ├── prisma/          ← schema e migrations
  ├── src/
  │   ├── modules/     ← um diretório por módulo (nfe, tickets, portaria, risco, docas, romaneio...)
  │   ├── integrations/← simulações (notificacao, risco externo, rastreador)
  │   └── shared/      ← erros, utilitários, prisma client
  └── scripts/         ← seed e simulador de rastreio
  ```

---

## 9. Pendências

Aguardando resposta do time:
- [ ] **IA**: onde entra e o que faz no sistema.
- [ ] **Telas do front**: quais serão feitas (define o que os endpoints precisam devolver).
- [ ] Várias notas com a mesma placa viram **1 ticket ou vários**?
- [ ] Vai ter **login e perfis** (porteiro, colaborador, ADM)?
- [ ] **Quem baixa as entregas**: motorista pelo link ou alguém no painel?
- [ ] **Um CD ou vários?**
- [ ] **Critérios reais da análise de risco.**
- [ ] **Prioridade na fila** de doca (só ordem de chegada?).
- [ ] **Validade do link** do motorista.
- [ ] Precisa de **endpoint de indicadores** (OTIF, insucesso, tempo de viagem, ocupação)?
- [ ] **XMLs de exemplo** reais para testar a triagem.

Até lá, o backend segue com as premissas deste documento; quando uma resposta mudar uma regra, atualize a seção correspondente **e** a spec no roadmap antes de mexer no código.
