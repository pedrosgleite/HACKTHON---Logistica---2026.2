/**
 * Documento OpenAPI servido em /docs.
 * Cada módulo adiciona suas rotas em `paths` (ou mescla o próprio objeto aqui) ao ser implementado.
 */
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "ARGOS IA LOGISTIC — API",
    version: "0.1.0",
    description: "API do fluxo logístico: NF-e → Ticket → Portaria → Risco → Doca → Romaneio → Saída → Entregas.",
  },
  servers: [{ url: "/" }],
  components: {
    schemas: {
      Erro: {
        type: "object",
        required: ["erro"],
        properties: {
          erro: { type: "string", example: "Dados inválidos" },
          detalhes: { nullable: true, description: "Informações extras (ex.: issues do Zod)" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "Verifica se a API está no ar",
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" } } } } },
          },
        },
      },
    },
    "/nfe/xml": {
      post: {
        tags: ["NF-e"],
        summary: "Ingere o XML da NF-e, faz a triagem e cria o ticket",
        description: "Aceita JSON { xml, origemSistema, ticketId? } ou o XML cru (application/xml) com origemSistema/ticketId na query.",
        parameters: [
          { name: "origemSistema", in: "query", required: false, schema: { type: "string", enum: ["SAP", "TOTVS"] }, description: "Obrigatório quando o corpo é XML cru" },
          { name: "ticketId", in: "query", required: false, schema: { type: "string" }, description: "Anexa a nota a um ticket existente" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["xml", "origemSistema"],
                properties: { xml: { type: "string" }, origemSistema: { type: "string", enum: ["SAP", "TOTVS"] }, ticketId: { type: "string" } },
              },
            },
            "application/xml": { schema: { type: "string" } },
          },
        },
        responses: {
          201: { description: "Nota salva e ticket criado (ou nota anexada ao ticketId)" },
          404: { description: "ticketId não encontrado" },
          409: { description: "Chave de acesso já importada" },
          422: { description: "XML inválido ou nota não envolve o CNPJ do CD" },
        },
      },
    },
    "/nfe/{id}": {
      get: {
        tags: ["NF-e"],
        summary: "Detalhe da nota",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Nota não encontrada" } },
      },
    },
    "/tickets": {
      post: {
        tags: ["Tickets"],
        summary: "Cria ticket manual (solicitação de frete)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tipoPatio"],
                properties: {
                  tipoPatio: { type: "string", enum: ["COLETA", "RECEBIMENTO"] },
                  frota: { type: "string", enum: ["PROPRIA", "TERCEIRA"] },
                  observacoes: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Ticket criado com origem MANUAL" }, 422: { description: "Dados inválidos" } },
      },
      get: {
        tags: ["Tickets"],
        summary: "Lista tickets com filtros",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "frota", in: "query", schema: { type: "string", enum: ["PROPRIA", "TERCEIRA"] } },
          { name: "tipoPatio", in: "query", schema: { type: "string", enum: ["COLETA", "RECEBIMENTO"] } },
          { name: "busca", in: "query", schema: { type: "string" }, description: "Código do ticket ou placa" },
        ],
        responses: { 200: { description: "OK" }, 422: { description: "Filtro inválido" } },
      },
    },
    "/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Detalhe com linha do tempo, notas, acessos, análises, romaneios, docas e ocorrências",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK (inclui proximosStatus permitidos)" }, 404: { description: "Ticket não encontrado" } },
      },
    },
    "/tickets/{id}/cancelar": {
      post: {
        tags: ["Tickets"],
        summary: "Cancela o ticket (qualquer status aberto)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { motivo: { type: "string" } } } } } },
        responses: { 200: { description: "Cancelado" }, 404: { description: "Ticket não encontrado" }, 422: { description: "Ticket já encerrado/cancelado" } },
      },
    },
    "/painel": {
      get: {
        tags: ["Painel"],
        summary: "Resumo do Painel Central: contagem por status, 10 docas, fila e ocorrências abertas",
        responses: { 200: { description: "OK" } },
      },
    },
    "/romaneios": {
      post: {
        tags: ["Romaneios"],
        summary: "Cria romaneio a partir do ticket (notas livres) ou de uma lista de notas do mesmo ticket",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { ticketId: { type: "string" }, notaIds: { type: "array", items: { type: "string" } } } },
            },
          },
        },
        responses: {
          201: { description: "Criado EM_MONTAGEM com totais de volumes e peso" },
          404: { description: "Ticket ou nota não encontrado" },
          409: { description: "Nota já está em outro romaneio" },
          422: { description: "Sem notas livres, notas de tickets diferentes ou ticket encerrado" },
        },
      },
    },
    "/romaneios/{id}": {
      get: {
        tags: ["Romaneios"],
        summary: "Detalhe com notas, entregas e ocorrências",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Romaneio não encontrado" } },
      },
    },
    "/romaneios/{id}/notas": {
      post: {
        tags: ["Romaneios"],
        summary: "Adiciona notas (só EM_MONTAGEM)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["notaIds"], properties: { notaIds: { type: "array", items: { type: "string" } } } } } },
        },
        responses: { 200: { description: "Notas adicionadas e totais recalculados" }, 409: { description: "Nota em outro romaneio" }, 422: { description: "Romaneio fora de montagem ou nota de outro ticket" } },
      },
    },
    "/romaneios/{id}/conferir": {
      post: {
        tags: ["Romaneios"],
        summary: "Confere volumes por nota",
        description: "Volumes iguais → CONFERIDO. Divergência → gera ocorrência DIVERGENCIA; só confere com aceitarDivergencia=true (senão 422).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["itens"],
                properties: {
                  itens: {
                    type: "array",
                    items: { type: "object", required: ["notaFiscalId", "volumes"], properties: { notaFiscalId: { type: "string" }, volumes: { type: "integer" } } },
                  },
                  pesoConferido: { type: "number" },
                  aceitarDivergencia: { type: "boolean", default: false },
                  observacao: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "CONFERIDO" }, 422: { description: "Divergência não aceita, nota faltando ou romaneio fora de montagem" } },
      },
    },
    "/romaneios/{id}/liberar": {
      post: {
        tags: ["Romaneios"],
        summary: "Libera o romaneio e gera uma entrega por nota",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "LIBERADO com entregas PROGRAMADA" }, 422: { description: "Romaneio não conferido" } },
      },
    },
    "/rastreio/posicao": {
      post: {
        tags: ["Rastreio"],
        summary: "Recebe posição do rastreador, recalcula ETA e detecta a cerca eletrônica",
        description:
          "Primeira posição de ticket CRIADO → EM_DESLOCAMENTO. ETA atrasando mais que ATRASO_LIMITE_MIN → ocorrência ATRASO. " +
          "Frota própria entrando no raio (CERCA_RAIO_KM) → entrada automática + C1 + C3; saindo → registrarSaida() (exige C2).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["placa", "lat", "lng"],
                properties: {
                  placa: { type: "string", example: "ABC1D23" },
                  lat: { type: "number", example: -23.5 },
                  lng: { type: "number", example: -46.6333 },
                  velocidade: { type: "number", description: "km/h" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Posição salva" }, 404: { description: "Veículo não cadastrado ou sem ticket aberto" }, 422: { description: "Dados inválidos" } },
      },
    },
    "/tickets/{id}/eta": {
      get: {
        tags: ["Rastreio"],
        summary: "ETA atual e distância até o CD",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK (disponivel=false se ainda não há posições)" }, 404: { description: "Ticket não encontrado" } },
      },
    },
    "/tickets/{id}/posicoes": {
      get: {
        tags: ["Rastreio"],
        summary: "Trajeto (posições em ordem)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Ticket não encontrado" } },
      },
    },
    "/entregas": {
      get: {
        tags: ["Entregas"],
        summary: "Lista entregas (por romaneio ou ticket)",
        parameters: [
          { name: "romaneioId", in: "query", schema: { type: "string" } },
          { name: "ticketId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "OK, em ordem de sequência" }, 422: { description: "Informe romaneioId ou ticketId" } },
      },
    },
    "/entregas/{id}/baixa": {
      post: {
        tags: ["Entregas"],
        summary: "Registra o resultado da entrega + comprovante (POD)",
        description:
          "Sem `resultado`: entrega realizada (ENTREGUE, ou PARCIAL + ocorrência se volumes < previstos); exige recebedorNome, recebedorDoc, volumesEntregues e comprovanteUrl. " +
          "Com `resultado` RECUSADA/DESTINATARIO_AUSENTE/INSUCESSO: exige motivo. Última entrega final → romaneio FINALIZADO; todos finalizados → ticket ENCERRADO.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  resultado: { type: "string", enum: ["RECUSADA", "DESTINATARIO_AUSENTE", "INSUCESSO"] },
                  volumesEntregues: { type: "integer" },
                  recebedorNome: { type: "string" },
                  recebedorDoc: { type: "string" },
                  comprovanteUrl: { type: "string", format: "uri" },
                  baixadaEm: { type: "string", format: "date-time" },
                  motivo: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Baixa registrada (inclui romaneioFinalizado e ticketEncerrado)" },
          404: { description: "Entrega não encontrada" },
          409: { description: "Entrega já recebeu baixa" },
          422: { description: "Entrega não está EM_ROTA, dados faltando ou volumes inválidos" },
        },
      },
    },
    "/portaria/entrada": {
      post: {
        tags: ["Portaria"],
        summary: "Registra a entrada de um veículo",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["placa"], properties: { placa: { type: "string", example: "TER3F45" }, ticketId: { type: "string" } } } } },
        },
        responses: { 201: { description: "Entrada registrada" }, 409: { description: "Placa sem ticket aberto ou inconsistente" }, 422: { description: "Dados inválidos" } },
      },
    },
    "/portaria/{acessoId}/carreta": {
      patch: {
        tags: ["Portaria"],
        summary: "Informa a carreta ou somente o cavalo",
        parameters: [{ name: "acessoId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { oneOf: [{ type: "object", required: ["placa"], properties: { placa: { type: "string", example: "TCR5H67" } } }, { type: "object", required: ["somenteCavalo"], properties: { somenteCavalo: { type: "boolean", enum: [true] } } }] } } },
        },
        responses: { 200: { description: "Dados da carreta registrados" }, 404: { description: "Acesso não encontrado" }, 422: { description: "Dados inválidos" } },
      },
    },
    "/portaria/{acessoId}/condutor": {
      patch: {
        tags: ["Portaria"],
        summary: "Informa o condutor e dispara a análise de risco",
        parameters: [{ name: "acessoId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["nome", "cpf", "telefone"], properties: { nome: { type: "string", example: "Joao da Silva" }, cpf: { type: "string", example: "11144477735" }, telefone: { type: "string", example: "+5511990000001" } } } } },
        },
        responses: { 200: { description: "Condutor registrado e risco analisado" }, 404: { description: "Acesso não encontrado" }, 422: { description: "Dados inválidos" } },
      },
    },
    "/portaria/acessos": {
      get: {
        tags: ["Portaria"],
        summary: "Lista os acessos da portaria",
        parameters: [{ name: "status", in: "query", required: false, schema: { type: "string", enum: ["AGUARDANDO_DADOS", "EM_ANALISE", "LINK_ENVIADO", "LIBERADO", "SAIU", "BLOQUEADO"] } }],
        responses: { 200: { description: "Lista de acessos" }, 422: { description: "Status inválido" } },
      },
    },
    "/docas": {
      get: {
        tags: ["Docas"],
        summary: "Lista as 10 docas e suas alocações abertas",
        responses: { 200: { description: "Docas por número" } },
      },
    },
    "/docas/alocar": {
      post: {
        tags: ["Docas"],
        summary: "Aloca uma doca do pool do ticket ou retorna sua posição na fila",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["ticketId"], properties: { ticketId: { type: "string" } } } } },
        },
        responses: { 200: { description: "Doca alocada ou posição na fila" }, 404: { description: "Ticket não encontrado" }, 422: { description: "Ticket sem tipo de pátio ou transição inválida" } },
      },
    },
    "/docas/{id}/liberar": {
      post: {
        tags: ["Docas"],
        summary: "Libera a doca após conferir C2 e aloca automaticamente o primeiro da fila",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Doca liberada e próximo da fila alocado, quando houver" }, 404: { description: "Doca não encontrada" }, 422: { description: "Doca vazia ou romaneio não liberado" } },
      },
    },
    "/docas/{id}/status": {
      patch: {
        tags: ["Docas"],
        summary: "Altera o status da doca",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["LIVRE", "OCUPADA", "MANUTENCAO"] } } } } },
        },
        responses: { 200: { description: "Status atualizado" }, 404: { description: "Doca não encontrada" }, 422: { description: "Status incompatível com a alocação" } },
      },
    },
    "/docas/fila": {
      get: {
        tags: ["Docas"],
        summary: "Lista a fila por pool e posição",
        responses: { 200: { description: "Fila ordenada por tipo e posição" } },
      },
    },
    "/motorista/link/{token}": {
      get: {
        tags: ["Motorista"],
        summary: "Consulta ticket e veículos vinculados ao link",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Dados para a tela do motorista" }, 404: { description: "Link não encontrado" }, 409: { description: "Link já utilizado" }, 410: { description: "Link expirado" } },
      },
    },
    "/motorista/link/{token}/confirmar": {
      post: {
        tags: ["Motorista"],
        summary: "Confirma o link e aloca doca ou retorna posição na fila",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Confirmação registrada e alocação retornada" }, 409: { description: "Link já utilizado ou ticket não disponível" }, 410: { description: "Link expirado" } },
      },
    },
    "/motorista/link/{token}/localizacao": {
      post: {
        tags: ["Motorista"],
        summary: "Registra localização do veículo terceiro durante a viagem",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["placa", "lat", "lng"], properties: { placa: { type: "string" }, lat: { type: "number", minimum: -90, maximum: 90 }, lng: { type: "number", minimum: -180, maximum: 180 }, velocidade: { type: "number", minimum: 0, maximum: 200 } } } } },
        },
        responses: { 201: { description: "Posição registrada no monitoramento da viagem" }, 404: { description: "Link ou veículo não encontrado" }, 409: { description: "Placa não pertence ao acesso" }, 410: { description: "Link expirado" }, 422: { description: "Localização fora da viagem ou frota não terceira" } },
      },
    },
    "/notificacoes": {
      get: {
        tags: ["Notificações"],
        summary: "Lista o histórico das notificações simuladas",
        responses: { 200: { description: "Notificações em ordem decrescente de envio" } },
      },
    },
  } as Record<string, unknown>,
};
