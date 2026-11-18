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
