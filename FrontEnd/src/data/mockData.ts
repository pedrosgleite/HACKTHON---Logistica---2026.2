export type FleetType = "PROPRIA" | "TERCEIRIZADA";
export type OperationType = "TRANSF" | "DISTRIB" | "FILIAL" | "COLETA";

export type XmlTicket = {
  id: string;
  nfe: string;
  cliente: string;
  origem: string;
  destino: string;
  frota: FleetType;
  operacao: OperationType;
  cavalo: string;
  carreta?: string;
  motorista: string;
  telefone: string;
  eta: string;
  risco: "BAIXO" | "MEDIO" | "ALTO";
  status: string;
  volumes: number;
  pesoKg: number;
};

export type DockSlot = {
  id: number;
  pool: "RECEBIMENTO" | "COLETA";
  status: "LIVRE" | "OCUPADA" | "MANUTENCAO";
  ticketId?: string;
  placa?: string;
  operacao?: string;
  progresso?: number;
  tempoRestante?: string;
};

export type RomaneioItem = {
  id: string;
  viagemId: string;
  status: "EM EXECUCAO" | "FINALIZADO";
  motorista: string;
  veiculo: string;
  rota: string;
  coletas: Array<{
    id: string;
    cliente: string;
    volumes: number;
    peso: number;
  }>;
  entregas: Array<{
    id: string;
    destino: string;
    volumes: number;
    status: "PENDENTE" | "ENTREGUE";
  }>;
};

export const INITIAL_TICKETS: XmlTicket[] = [
  {
    id: "TK-9044",
    nfe: "NF-e 000.482.144",
    cliente: "Logistica Serra Verde",
    origem: "Teresopolis / RJ",
    destino: "CD Cajamar / SP",
    frota: "PROPRIA",
    operacao: "DISTRIB",
    cavalo: "ARG-02",
    carreta: "CRT-9910",
    motorista: "Rafael Mendes",
    telefone: "(21) 99655-1209",
    eta: "38 min",
    risco: "MEDIO",
    status: "LINK_ENVIADO",
    volumes: 120,
    pesoKg: 980,
  },
];

export const INITIAL_DOCKS: DockSlot[] = [
  { id: 1, pool: "RECEBIMENTO", status: "OCUPADA", ticketId: "TK-9044", placa: "KXP-4B91", operacao: "Descarga NF-e 482144", progresso: 64, tempoRestante: "18 min" },
  { id: 2, pool: "RECEBIMENTO", status: "LIVRE" },
  { id: 3, pool: "RECEBIMENTO", status: "OCUPADA", ticketId: "TK-9038", placa: "RJT-8E22", operacao: "Descarga NF-e 482138", progresso: 31, tempoRestante: "32 min" },
  { id: 4, pool: "RECEBIMENTO", status: "LIVRE" },
  { id: 5, pool: "COLETA", status: "LIVRE" },
  { id: 6, pool: "COLETA", status: "OCUPADA", ticketId: "ROM-126", placa: "ARG-7X90", operacao: "Coleta Romaneio #126", progresso: 72, tempoRestante: "12 min" },
  { id: 7, pool: "COLETA", status: "LIVRE" },
  { id: 8, pool: "COLETA", status: "MANUTENCAO" },
  { id: 9, pool: "COLETA", status: "LIVRE" },
  { id: 10, pool: "COLETA", status: "LIVRE" },
];

export const INITIAL_ROMANEIOS: RomaneioItem[] = [
  {
    id: "ROM-2026-00125",
    viagemId: "VG-00125",
    status: "EM EXECUCAO",
    motorista: "Rafael Mendes",
    veiculo: "ARG-02",
    rota: "Teresopolis / RJ -> CD Cajamar / SP",
    coletas: [
      { id: "CO-001", cliente: "Serra Verde Alimentos", volumes: 100, peso: 800 },
      { id: "CO-002", cliente: "Distribuidora Central", volumes: 80, peso: 600 },
    ],
    entregas: [
      { id: "ENT-001", destino: "CD Cajamar / SP", volumes: 120, status: "PENDENTE" },
      { id: "ENT-002", destino: "Filial Barueri / SP", volumes: 60, status: "PENDENTE" },
    ],
  },
];
