/**
 * Dados de teste da SPEC-00. Fictícios.
 * As placas e CNPJs batem com os XMLs de scripts/xml/.
 * CNPJ do CD (EMPRESA_CNPJ) usado nos exemplos: 11222333000181.
 */

export const CNPJ_CD = "11222333000181";

export const docas = [
  ...Array.from({ length: 4 }, (_, i) => ({ numero: i + 1, tipo: "COLETA" })),
  ...Array.from({ length: 6 }, (_, i) => ({ numero: i + 5, tipo: "RECEBIMENTO" })),
];

export const clientes = [
  { cnpj: CNPJ_CD, razaoSocial: "ARGOS Centro de Distribuicao LTDA", cidade: "Sao Paulo", uf: "SP" },
  { cnpj: "11222333000262", razaoSocial: "ARGOS Filial Campinas LTDA", cidade: "Campinas", uf: "SP" },
  { cnpj: "44555666000177", razaoSocial: "Mercado Bom Preco SA", cidade: "Santos", uf: "SP" },
  { cnpj: "77888999000155", razaoSocial: "Industria Alimentos Vale LTDA", cidade: "Jundiai", uf: "SP" },
];

export const veiculos = [
  // frota própria
  { placa: "ABC1D23", tipo: "CAVALO", frota: "PROPRIA" },
  { placa: "ABC2E34", tipo: "CAVALO", frota: "PROPRIA" },
  { placa: "CAR1A11", tipo: "CARRETA", frota: "PROPRIA" },
  { placa: "CAR2B22", tipo: "CARRETA", frota: "PROPRIA" },
  // terceiros
  { placa: "TER3F45", tipo: "CAVALO", frota: "TERCEIRA" },
  { placa: "TER4G56", tipo: "CAVALO", frota: "TERCEIRA", restricao: true, motivoRestricao: "Veiculo com pendencia na gerenciadora" },
  { placa: "TCR5H67", tipo: "CARRETA", frota: "TERCEIRA" },
];

const hoje = new Date();
const anos = (n: number) => new Date(hoje.getFullYear() + n, hoje.getMonth(), hoje.getDate());

export const motoristas = [
  { nome: "Joao da Silva", cpf: "11144477735", telefone: "+5511990000001", cnhNumero: "01234567890", cnhValidade: anos(3) },
  { nome: "Carlos Pereira", cpf: "22255588846", telefone: "+5511990000002", cnhNumero: "01234567891", cnhValidade: anos(2) },
  { nome: "Marcos Souza", cpf: "33366699957", telefone: "+5511990000003", cnhNumero: "01234567892", cnhValidade: anos(-1) }, // CNH VENCIDA
  { nome: "Pedro Almeida", cpf: "44477700068", telefone: "+5511990000004", cnhNumero: "01234567893", cnhValidade: anos(4), restricao: true, motivoRestricao: "Motorista com restricao cadastral" }, // COM RESTRIÇÃO
];
