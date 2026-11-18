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
  } as Record<string, unknown>,
};
