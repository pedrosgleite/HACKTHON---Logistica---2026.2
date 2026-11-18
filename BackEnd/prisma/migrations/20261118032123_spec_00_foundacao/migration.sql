-- CreateEnum
CREATE TYPE "TipoPatio" AS ENUM ('COLETA', 'RECEBIMENTO');

-- CreateEnum
CREATE TYPE "TipoOperacao" AS ENUM ('NORMAL', 'TRANSFERENCIA', 'FILIAL');

-- CreateEnum
CREATE TYPE "OrigemTicket" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('CRIADO', 'EM_DESLOCAMENTO', 'NA_PORTARIA', 'EM_ANALISE_RISCO', 'BLOQUEADO', 'AGUARDANDO_MOTORISTA', 'AGUARDANDO_DOCA', 'EM_DOCA', 'LIBERADO_SAIDA', 'EM_TRANSITO', 'ENCERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('CAVALO', 'CARRETA');

-- CreateEnum
CREATE TYPE "TipoFrota" AS ENUM ('PROPRIA', 'TERCEIRA');

-- CreateEnum
CREATE TYPE "DocaTipo" AS ENUM ('COLETA', 'RECEBIMENTO');

-- CreateEnum
CREATE TYPE "DocaStatus" AS ENUM ('LIVRE', 'OCUPADA', 'MANUTENCAO');

-- CreateEnum
CREATE TYPE "AcessoStatus" AS ENUM ('AGUARDANDO_DADOS', 'EM_ANALISE', 'LINK_ENVIADO', 'LIBERADO', 'SAIU', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "AnaliseRiscoStatus" AS ENUM ('APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "RomaneioStatus" AS ENUM ('EM_MONTAGEM', 'CONFERIDO', 'LIBERADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "EntregaStatus" AS ENUM ('PROGRAMADA', 'EM_ROTA', 'ENTREGUE', 'PARCIAL', 'RECUSADA', 'DESTINATARIO_AUSENTE', 'INSUCESSO');

-- CreateEnum
CREATE TYPE "TipoOcorrencia" AS ENUM ('DIVERGENCIA', 'ATRASO', 'AVARIA', 'RISCO', 'PLACA_DIVERGENTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('SMS', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT,
    "volumes" INTEGER NOT NULL,
    "peso" DECIMAL(12,3) NOT NULL,
    "placa" TEXT,
    "cfop" TEXT,
    "tipoPatio" "TipoPatio" NOT NULL,
    "operacao" "TipoOperacao" NOT NULL DEFAULT 'NORMAL',
    "origemSistema" TEXT,
    "motivoTriagem" TEXT,
    "emitenteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "ticketId" TEXT,
    "romaneioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'CRIADO',
    "origem" "OrigemTicket" NOT NULL,
    "frota" "TipoFrota",
    "tipoPatio" "TipoPatio",
    "motivoTriagem" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dados" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "frota" "TipoFrota" NOT NULL,
    "restricao" BOOLEAN NOT NULL DEFAULT false,
    "motivoRestricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motorista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cnhNumero" TEXT,
    "cnhValidade" TIMESTAMP(3),
    "restricao" BOOLEAN NOT NULL DEFAULT false,
    "motivoRestricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoPortaria" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "cavaloId" TEXT NOT NULL,
    "carretaId" TEXT,
    "motoristaId" TEXT,
    "status" "AcessoStatus" NOT NULL DEFAULT 'AGUARDANDO_DADOS',
    "somenteCavalo" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,
    "tokenValidade" TIMESTAMP(3),
    "tokenUsado" BOOLEAN NOT NULL DEFAULT false,
    "entradaEm" TIMESTAMP(3),
    "saidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoPortaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnaliseRisco" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "acessoId" TEXT NOT NULL,
    "status" "AnaliseRiscoStatus" NOT NULL,
    "score" INTEGER NOT NULL,
    "motivos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnaliseRisco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doca" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" "DocaTipo" NOT NULL,
    "status" "DocaStatus" NOT NULL DEFAULT 'LIVRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlocacaoDoca" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "docaId" TEXT NOT NULL,
    "entradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saidaEm" TIMESTAMP(3),

    CONSTRAINT "AlocacaoDoca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilaDoca" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "tipo" "DocaTipo" NOT NULL,
    "posicao" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilaDoca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Romaneio" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" "RomaneioStatus" NOT NULL DEFAULT 'EM_MONTAGEM',
    "volumesPrevistos" INTEGER NOT NULL DEFAULT 0,
    "volumesConferidos" INTEGER,
    "pesoPrevisto" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "pesoConferido" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Romaneio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "romaneioId" TEXT NOT NULL,
    "notaFiscalId" TEXT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "status" "EntregaStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "volumesPrevistos" INTEGER NOT NULL,
    "volumesEntregues" INTEGER,
    "recebedorNome" TEXT,
    "recebedorDoc" TEXT,
    "comprovanteUrl" TEXT,
    "baixadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosicaoVeiculo" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "velocidade" DOUBLE PRECISION,
    "etaMinutos" INTEGER,
    "distanciaKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosicaoVeiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "romaneioId" TEXT,
    "tipo" "TipoOcorrencia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "dados" JSONB,
    "resolvida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "acessoId" TEXT,
    "canal" "CanalNotificacao" NOT NULL,
    "destino" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cnpj_key" ON "Cliente"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "NotaFiscal_chave_key" ON "NotaFiscal"("chave");

-- CreateIndex
CREATE INDEX "NotaFiscal_ticketId_idx" ON "NotaFiscal"("ticketId");

-- CreateIndex
CREATE INDEX "NotaFiscal_romaneioId_idx" ON "NotaFiscal"("romaneioId");

-- CreateIndex
CREATE INDEX "NotaFiscal_placa_idx" ON "NotaFiscal"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_codigo_key" ON "Ticket"("codigo");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_frota_idx" ON "Ticket"("frota");

-- CreateIndex
CREATE INDEX "Ticket_tipoPatio_idx" ON "Ticket"("tipoPatio");

-- CreateIndex
CREATE INDEX "EventoTicket_ticketId_createdAt_idx" ON "EventoTicket"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "Veiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Motorista_cpf_key" ON "Motorista"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "AcessoPortaria_token_key" ON "AcessoPortaria"("token");

-- CreateIndex
CREATE INDEX "AcessoPortaria_ticketId_idx" ON "AcessoPortaria"("ticketId");

-- CreateIndex
CREATE INDEX "AcessoPortaria_status_idx" ON "AcessoPortaria"("status");

-- CreateIndex
CREATE INDEX "AnaliseRisco_ticketId_idx" ON "AnaliseRisco"("ticketId");

-- CreateIndex
CREATE INDEX "AnaliseRisco_acessoId_idx" ON "AnaliseRisco"("acessoId");

-- CreateIndex
CREATE UNIQUE INDEX "Doca_numero_key" ON "Doca"("numero");

-- CreateIndex
CREATE INDEX "Doca_tipo_status_idx" ON "Doca"("tipo", "status");

-- CreateIndex
CREATE INDEX "AlocacaoDoca_docaId_saidaEm_idx" ON "AlocacaoDoca"("docaId", "saidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "AlocacaoDoca_ticketId_saidaEm_key" ON "AlocacaoDoca"("ticketId", "saidaEm");

-- CreateIndex
CREATE INDEX "FilaDoca_tipo_posicao_idx" ON "FilaDoca"("tipo", "posicao");

-- CreateIndex
CREATE UNIQUE INDEX "FilaDoca_ticketId_tipo_key" ON "FilaDoca"("ticketId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Romaneio_codigo_key" ON "Romaneio"("codigo");

-- CreateIndex
CREATE INDEX "Entrega_romaneioId_sequencia_idx" ON "Entrega"("romaneioId", "sequencia");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_romaneioId_notaFiscalId_key" ON "Entrega"("romaneioId", "notaFiscalId");

-- CreateIndex
CREATE INDEX "PosicaoVeiculo_ticketId_createdAt_idx" ON "PosicaoVeiculo"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "PosicaoVeiculo_veiculoId_createdAt_idx" ON "PosicaoVeiculo"("veiculoId", "createdAt");

-- CreateIndex
CREATE INDEX "Ocorrencia_ticketId_idx" ON "Ocorrencia"("ticketId");

-- CreateIndex
CREATE INDEX "Ocorrencia_tipo_resolvida_idx" ON "Ocorrencia"("tipo", "resolvida");

-- CreateIndex
CREATE INDEX "Notificacao_ticketId_idx" ON "Notificacao"("ticketId");

-- CreateIndex
CREATE INDEX "Notificacao_acessoId_idx" ON "Notificacao"("acessoId");

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_emitenteId_fkey" FOREIGN KEY ("emitenteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_romaneioId_fkey" FOREIGN KEY ("romaneioId") REFERENCES "Romaneio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTicket" ADD CONSTRAINT "EventoTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoPortaria" ADD CONSTRAINT "AcessoPortaria_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoPortaria" ADD CONSTRAINT "AcessoPortaria_cavaloId_fkey" FOREIGN KEY ("cavaloId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoPortaria" ADD CONSTRAINT "AcessoPortaria_carretaId_fkey" FOREIGN KEY ("carretaId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoPortaria" ADD CONSTRAINT "AcessoPortaria_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Motorista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRisco" ADD CONSTRAINT "AnaliseRisco_acessoId_fkey" FOREIGN KEY ("acessoId") REFERENCES "AcessoPortaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoDoca" ADD CONSTRAINT "AlocacaoDoca_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoDoca" ADD CONSTRAINT "AlocacaoDoca_docaId_fkey" FOREIGN KEY ("docaId") REFERENCES "Doca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaDoca" ADD CONSTRAINT "FilaDoca_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_romaneioId_fkey" FOREIGN KEY ("romaneioId") REFERENCES "Romaneio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_notaFiscalId_fkey" FOREIGN KEY ("notaFiscalId") REFERENCES "NotaFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicaoVeiculo" ADD CONSTRAINT "PosicaoVeiculo_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicaoVeiculo" ADD CONSTRAINT "PosicaoVeiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_romaneioId_fkey" FOREIGN KEY ("romaneioId") REFERENCES "Romaneio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_acessoId_fkey" FOREIGN KEY ("acessoId") REFERENCES "AcessoPortaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
