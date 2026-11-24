# ARGOS IA LOGISTIC

Interface web de uma torre de controle logística, construída com Next.js e React. O painel reúne indicadores operacionais e cenários demonstrativos de triagem de NF-e, romaneios, docas, frota e rotas.

> **Estado atual:** este projeto é uma demonstração de frontend. Os dados operacionais são simulados no navegador; não há integração com backend, banco de dados, leitura real de XML, OCR ou serviço de inteligência artificial.

## O que o sistema faz

O painel apresenta cinco áreas:

- **Central Command:** indicadores de operação e atalhos para as demais áreas.
- **Triagem XML / NF-e:** consulta os tickets de demonstração e permite cadastrar um ticket por formulário.
- **Operação & Romaneio:** exibe coletas e entregas; é possível marcar entregas como concluídas.
- **Portaria & 10 Docas:** mostra o estado das docas e permite ocupar ou liberar docas. A simulação atualiza o progresso das docas ocupadas.
- **Fleet, Route & Guard:** apresenta cenários visuais de frota, rota e alertas, além de controles demonstrativos.

Também é possível pausar e retomar a simulação, alterar sua velocidade e selecionar o idioma da interface. A preferência de idioma fica salva no armazenamento local do navegador. Os demais dados e alterações são mantidos apenas no estado da página e voltam aos valores iniciais ao recarregar.

## Tecnologias

- Next.js 15 e React 19
- TypeScript
- Tailwind CSS 4
- GSAP para animações
- Lucide React para ícones

## Requisitos

- Node.js 18.18 ou superior
- npm

## Como iniciar

No terminal, a partir da pasta raiz do projeto:

```bash
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. O servidor de desenvolvimento atualiza a página automaticamente quando os arquivos são alterados.

Para gerar e executar uma versão de produção:

```bash
npm run build
npm run start
```

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js. |
| `npm run build` | Gera a compilação de produção. |
| `npm run start` | Inicia o servidor usando a compilação de produção. |

## Estrutura principal

```text
src/
  app/
    page.tsx                 Página principal e interações do painel
    layout.tsx               Layout raiz e metadados
    globals.css              Estilos globais
  components/
    ReactBitsTacticalBackground.tsx  Fundo animado da interface
    Ui21stComponents.tsx             Componentes visuais reutilizáveis
  data/
    mockData.ts              Dados iniciais de tickets, docas e romaneios
  i18n.tsx                   Tipo e contêiner de idioma
```

## Limitações da demonstração

- Tickets, docas, romaneios, alertas, métricas e respostas do Copilot são dados e comportamentos locais de demonstração.
- O formulário cria tickets na memória da página; não importa nem interpreta arquivos XML/NF-e.
- A validação OCR, telemetria, análise de rota e ações de segurança são representações de interface, não integrações operacionais.
- Não há API, autenticação ou persistência dos dados operacionais.
