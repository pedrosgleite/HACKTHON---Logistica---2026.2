import express, { Router } from "express";
import { ingestaoSchema } from "./nfe.schemas";
import { detalharNota, ingerirXml } from "./nfe.service";

export const nfeRouter = Router();

/**
 * POST /nfe/xml
 * - JSON: { xml, origemSistema: "SAP" | "TOTVS", ticketId? }
 * - XML cru (Content-Type application/xml ou text/xml — ex.: arquivo com curl --data-binary @nota.xml):
 *   origemSistema e ticketId vão na query (?origemSistema=SAP)
 */
nfeRouter.post("/xml", express.text({ type: ["application/xml", "text/xml"], limit: "5mb" }), async (req, res, next) => {
  try {
    const bruto = typeof req.body === "string" ? { ...req.query, xml: req.body } : req.body;
    const input = ingestaoSchema.parse(bruto);
    res.status(201).json(await ingerirXml(input));
  } catch (error) {
    next(error);
  }
});

nfeRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await detalharNota(req.params.id));
  } catch (error) {
    next(error);
  }
});
