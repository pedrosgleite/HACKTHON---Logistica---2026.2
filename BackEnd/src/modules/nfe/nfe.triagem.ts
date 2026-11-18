import type { TipoFrota, TipoOperacao, TipoPatio } from "@prisma/client";
import { AppError } from "../../shared/errors";

/** Regras de PROJETO.md §5.1 — funções puras, sem banco. */

export interface ResultadoTriagem {
  tipoPatio: TipoPatio;
  operacao: TipoOperacao;
  frota: TipoFrota;
  motivo: string;
}

const raiz = (cnpj: string) => cnpj.slice(0, 8);

export function decidirTipoPatio(cnpjCd: string, emitente: string, destinatario: string): { tipoPatio: TipoPatio; motivo: string } {
  if (emitente === cnpjCd) return { tipoPatio: "COLETA", motivo: "emitente = CNPJ do CD → COLETA" };
  if (destinatario === cnpjCd) return { tipoPatio: "RECEBIMENTO", motivo: "destinatário = CNPJ do CD → RECEBIMENTO" };
  throw new AppError("Nota não envolve o CD: nem emitente nem destinatário é o CNPJ do CD", 422, {
    cnpjCd,
    emitente,
    destinatario,
  });
}

export function decidirOperacao(emitente: string, destinatario: string): { operacao: TipoOperacao; motivo: string } {
  if (raiz(emitente) === raiz(destinatario)) {
    return { operacao: "TRANSFERENCIA", motivo: `mesma raiz de CNPJ (${raiz(emitente)}) → TRANSFERENCIA` };
  }
  return { operacao: "NORMAL", motivo: "raízes de CNPJ diferentes → NORMAL" };
}

export function decidirFrota(placa: string | undefined, placaEhPropria: boolean): { frota: TipoFrota; motivo: string } {
  if (!placa) return { frota: "TERCEIRA", motivo: "nota sem placa → TERCEIRA" };
  if (placaEhPropria) return { frota: "PROPRIA", motivo: `placa ${placa} cadastrada como frota própria → PROPRIA` };
  return { frota: "TERCEIRA", motivo: `placa ${placa} não é da frota própria → TERCEIRA` };
}

export function triar(params: {
  cnpjCd: string;
  emitente: string;
  destinatario: string;
  placa?: string;
  placaEhPropria: boolean;
}): ResultadoTriagem {
  const p = decidirTipoPatio(params.cnpjCd, params.emitente, params.destinatario);
  const o = decidirOperacao(params.emitente, params.destinatario);
  const f = decidirFrota(params.placa, params.placaEhPropria);
  return { tipoPatio: p.tipoPatio, operacao: o.operacao, frota: f.frota, motivo: [p.motivo, o.motivo, f.motivo].join("; ") };
}
