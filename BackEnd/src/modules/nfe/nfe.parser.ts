import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import { AppError } from "../../shared/errors";

/** Dados da NF-e que o sistema usa (PROJETO.md §5.1). */
export interface ParteNota {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cidade?: string;
  uf?: string;
}

export interface NotaExtraida {
  chave: string;
  numero: string;
  serie?: string;
  tpNF?: string;
  emitente: ParteNota;
  destinatario: ParteNota;
  cfop?: string;
  placa?: string;
  transportadora?: { cnpj?: string; nome?: string };
  volumes: number;
  peso: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false, // tudo como string: CNPJ com zero à esquerda, chave de 44 dígitos
  trimValues: true,
  isArray: (nome) => nome === "det" || nome === "vol",
});

const soDigitos = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");
const texto = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
const numero = (v: unknown) => {
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : 0;
};

const parteSchema = z.object({
  cnpj: z.string().length(14, "CNPJ deve ter 14 dígitos (CPF não suportado)"),
  razaoSocial: z.string().min(1, "xNome obrigatório"),
  nomeFantasia: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
});

const notaSchema = z.object({
  chave: z.string().regex(/^\d{44}$/, "Chave de acesso deve ter 44 dígitos"),
  numero: z.string().min(1, "ide/nNF obrigatório"),
  serie: z.string().optional(),
  tpNF: z.string().optional(),
  emitente: parteSchema,
  destinatario: parteSchema,
  cfop: z.string().optional(),
  placa: z.string().optional(),
  transportadora: z.object({ cnpj: z.string().optional(), nome: z.string().optional() }).optional(),
  volumes: z.number().int().nonnegative(),
  peso: z.number().nonnegative(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type No = any;

function parte(no: No, ender: "enderEmit" | "enderDest"): ParteNota {
  return {
    cnpj: soDigitos(no?.CNPJ),
    razaoSocial: texto(no?.xNome) ?? "",
    nomeFantasia: texto(no?.xFant),
    cidade: texto(no?.[ender]?.xMun),
    uf: texto(no?.[ender]?.UF),
  };
}

/** Converte o XML da NF-e (com ou sem nfeProc) em objeto tipado. Lança 422 se inválido. */
export function parseNfeXml(xml: string): NotaExtraida {
  if (!xml || !xml.trim()) throw new AppError("XML vazio", 422);

  const valido = XMLValidator.validate(xml);
  if (valido !== true) {
    throw new AppError("XML malformado", 422, { linha: valido.err.line, motivo: valido.err.msg });
  }

  const doc: No = parser.parse(xml);
  const inf: No = (doc?.nfeProc?.NFe ?? doc?.NFe)?.infNFe;
  if (!inf) throw new AppError("XML não é uma NF-e: nó NFe/infNFe não encontrado", 422);

  const chave = soDigitos(doc?.nfeProc?.protNFe?.infProt?.chNFe) || soDigitos(inf["@_Id"]);
  const dets: No[] = inf.det ?? [];
  const vols: No[] = inf.transp?.vol ?? [];
  const transporta: No = inf.transp?.transporta;

  const extraida: NotaExtraida = {
    chave,
    numero: texto(inf.ide?.nNF) ?? "",
    serie: texto(inf.ide?.serie),
    tpNF: texto(inf.ide?.tpNF),
    emitente: parte(inf.emit, "enderEmit"),
    destinatario: parte(inf.dest, "enderDest"),
    cfop: texto(dets[0]?.prod?.CFOP),
    placa: texto(inf.transp?.veicTransp?.placa)?.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    transportadora: transporta ? { cnpj: soDigitos(transporta.CNPJ) || undefined, nome: texto(transporta.xNome) } : undefined,
    volumes: vols.reduce((s, v) => s + numero(v?.qVol), 0),
    peso: vols.reduce((s, v) => s + numero(v?.pesoB ?? v?.pesoL), 0),
  };

  const r = notaSchema.safeParse(extraida);
  if (!r.success) {
    throw new AppError(
      "NF-e com campos inválidos ou ausentes",
      422,
      r.error.issues.map((i) => ({ campo: i.path.join("."), motivo: i.message })),
    );
  }
  return r.data;
}
