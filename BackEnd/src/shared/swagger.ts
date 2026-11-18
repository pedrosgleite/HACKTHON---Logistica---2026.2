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
  } as Record<string, unknown>,
};
