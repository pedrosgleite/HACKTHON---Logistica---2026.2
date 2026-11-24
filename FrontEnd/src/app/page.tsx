"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Activity,
  AlertTriangle,
  Bot,
  Box,
  CheckCircle2,
  Cpu,
  Eye,
  FileCode2,
  FileText,
  Lock,
  MapPin,
  Navigation,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Truck,
  Unlock,
  Warehouse,
} from "lucide-react";
import { MagneticButton, SpotlightCard, StatusPill } from "@/components/Ui21stComponents";
import { Language, LocalizedContent } from "@/i18n";
import {
  DockSlot,
  FleetType,
  INITIAL_DOCKS,
  INITIAL_ROMANEIOS,
  INITIAL_TICKETS,
  OperationType,
  RomaneioItem,
  XmlTicket,
} from "@/data/mockData";

type TabId = "COMMAND" | "XML_TRIAGE" | "ROMANEIO" | "PORTARIA_DOCAS" | "FLEET_GUARD";

export default function ArgosIaLogisticPage() {
  const [language, setLanguage] = useState<Language>("pt");
  const [activeTab, setActiveTab] = useState<TabId>("COMMAND");
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(1);
  const [clock, setClock] = useState("22:08:49 BRT");

  // Estados operacionais
  const [tickets, setTickets] = useState<XmlTicket[]>(INITIAL_TICKETS);
  const [docks, setDocks] = useState<DockSlot[]>(INITIAL_DOCKS);
  const [romaneios, setRomaneios] = useState<RomaneioItem[]>(INITIAL_ROMANEIOS);

  // Cenários táticos
  const [deviationActive, setDeviationActive] = useState(true);
  const [routeOptimized, setRouteOptimized] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(false);
  const [coldChainAlert, setColdChainAlert] = useState(false);
  const [ocrValidated, setOcrValidated] = useState(false);

  // Modal de nova triagem XML
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [newXmlForm, setNewXmlForm] = useState({
    nfe: "NF-e 000.482.199",
    cliente: "Logística Serra Verde",
    origem: "Teresópolis / RJ",
    destino: "CD Cajamar / SP",
    frota: "TERCEIRIZADA" as FleetType,
    operacao: "DISTRIB" as OperationType,
    cavalo: "RJT-8E22",
    carreta: "CRT-9910",
    motorista: "Rafael Mendes",
    telefone: "(21) 99655-1209",
    volumes: 120,
    pesoKg: 980,
  });

  // Copilot Chat
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<string[]>([
    "ARGOS COPILOT ONLINE: Desvio detectado no veículo ARG-02 (+4.2 km da rota homologada Dutra). Recomendo envio imediato da rota alternativa Arco Metropolitano.",
  ]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("argos-language");
    if (savedLanguage === "pt" || savedLanguage === "en" || savedLanguage === "es") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const locale = language === "pt" ? "pt-BR" : language === "en" ? "en-US" : "es-ES";
    document.documentElement.lang = locale;
    document.title = language === "pt"
      ? "ARGOS IA LOGISTIC | Sistema Integrado de Inteligência Logística v3.0"
      : language === "en"
      ? "ARGOS AI LOGISTIC | Integrated Logistics Intelligence System v3.0"
      : "ARGOS IA LOGISTIC | Sistema Integrado de Inteligencia Logística v3.0";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === "pt"
        ? "Plataforma Tática de Torre de Controle Logística, Triagem XML/NF-e, Romaneios, Portaria OCR e 10 Docas."
        : language === "en"
        ? "Tactical logistics control tower platform with XML/NF-e triage, manifests, OCR gate and 10 docks."
        : "Plataforma táctica de torre de control logística con triaje XML/NF-e, hojas de ruta, portería OCR y 10 muelles.";
    }
  }, [language]);

  // Animações GSAP de entrada e pulso de telemetria
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-stagger",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.06,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [activeTab]);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const locale = language === "pt" ? "pt-BR" : language === "en" ? "en-US" : "es-ES";
      setClock(now.toLocaleTimeString(locale) + " BRT");
    }, 1000);
    return () => clearInterval(timer);
  }, [language]);

  // Simulação contínua do progresso das docas
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setDocks((prev) =>
        prev.map((d) => {
          if (d.status !== "OCUPADA" || d.progresso === undefined) return d;
          const next = d.progresso + 2 * simSpeed;
          if (next >= 100) {
            return { ...d, progresso: 100, tempoRestante: "Concluído" };
          }
          return { ...d, progresso: next };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning, simSpeed]);

  // Handlers
  const handleCreateXmlTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const created: XmlTicket = {
      id: `TK-${Math.floor(9045 + Math.random() * 900)}`,
      nfe: newXmlForm.nfe,
      cliente: newXmlForm.cliente,
      origem: newXmlForm.origem,
      destino: newXmlForm.destino,
      frota: newXmlForm.frota,
      operacao: newXmlForm.operacao,
      cavalo: newXmlForm.cavalo,
      carreta: newXmlForm.carreta || undefined,
      motorista: newXmlForm.motorista,
      telefone: newXmlForm.telefone,
      eta: "38 min",
      risco: newXmlForm.frota === "TERCEIRIZADA" ? "MEDIO" : "BAIXO",
      status: newXmlForm.carreta ? "LINK_ENVIADO" : "AGUARDANDO_PLACA",
      volumes: Number(newXmlForm.volumes),
      pesoKg: Number(newXmlForm.pesoKg),
    };
    setTickets((prev) => [created, ...prev]);
    setShowXmlModal(false);
  };

  const handleAllocateDock = (dockId: number) => {
    setDocks((prev) =>
      prev.map((d) =>
        d.id === dockId
          ? {
              ...d,
              status: "OCUPADA",
              ticketId: "TK-9044",
              placa: "KXP-4B91",
              operacao: d.pool === "RECEBIMENTO" ? "Descarga NF-e 482144" : "Coleta Romaneio #126",
              progresso: 10,
              tempoRestante: "40 min",
            }
          : d
      )
    );
  };

  const handleReleaseDock = (dockId: number) => {
    setDocks((prev) =>
      prev.map((d) =>
        d.id === dockId
          ? { id: d.id, pool: d.pool, status: "LIVRE" }
          : d
      )
    );
  };

  const handleCompleteDelivery = (romId: string, entregaId: string) => {
    setRomaneios((prev) =>
      prev.map((r) => {
        if (r.id !== romId) return r;
        const updatedEntregas = r.entregas.map((en) =>
          en.id === entregaId ? { ...en, status: "ENTREGUE" as const } : en
        );
        const allDone = updatedEntregas.every((en) => en.status === "ENTREGUE");
        return {
          ...r,
          entregas: updatedEntregas,
          status: allDone ? "FINALIZADO" : r.status,
        };
      })
    );
  };

  const handleSendCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    const q = copilotQuery;
    setCopilotQuery("");
    const response = deviationActive
      ? "ARGOS IA: Análise concluída. Frota ativa com 98,4% de conformidade SLA. Alerta crítico em ARG-02 (Helena Sparta) — sugestão de bloqueio preventivo ou desvio para Arco Metropolitano."
      : "ARGOS IA: Análise concluída. Frota ativa com 98,4% de conformidade SLA. Todos os corredores logísticos operando dentro da cerca eletrônica.";
    setCopilotMessages((prev) => [
      ...prev,
      `OPERADOR: ${q}`,
      response,
    ]);
  };

  const activeAlertsCount =
    (deviationActive ? 1 : 0) + (coldChainAlert ? 1 : 0) + 1;

  return (
    <LocalizedContent language={language}>
    <div ref={containerRef} className="min-h-screen relative text-slate-200 font-sans">

      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-[#04080f]/90 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center glow-cyan">
              <Eye className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">
                  ARGOS IA LOGISTIC
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  v3.0 QUANTUM
                </span>
              </div>
              <p className="text-[11px] font-mono tracking-[0.2em] text-cyan-400/80 uppercase">
                Sistema Integrado de Inteligência Logística & Torre de Controle
              </p>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-[#081220] p-1.5 rounded-xl border border-cyan-500/20">
            {[
              { id: "COMMAND", label: "CENTRAL COMMAND", icon: Cpu },
              { id: "XML_TRIAGE", label: "TRIAGEM XML / NF-e", icon: FileCode2, badge: `${tickets.length}` },
              { id: "ROMANEIO", label: "OPERAÇÃO & ROMANEIO", icon: FileText },
              { id: "PORTARIA_DOCAS", label: "PORTARIA & 10 DOCAS", icon: Warehouse },
              { id: "FLEET_GUARD", label: "FLEET, ROUTE & GUARD", icon: ShieldAlert, badge: `${activeAlertsCount} ALERTAS` },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                    active
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        tab.id === "FLEET_GUARD"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-cyan-500/20 text-cyan-300"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <label className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-[#081220] px-3 py-2 text-xs font-mono text-slate-300">
            <span>Idioma</span>
            <select
              value={language}
              onChange={(event) => {
                const nextLanguage = event.target.value;
                if (nextLanguage === "pt" || nextLanguage === "en" || nextLanguage === "es") {
                  setLanguage(nextLanguage);
                  window.localStorage.setItem("argos-language", nextLanguage);
                }
              }}
              aria-label="Idioma"
              className="bg-transparent text-cyan-300 outline-none"
            >
              <option className="bg-[#081220]" value="pt">Português</option>
              <option className="bg-[#081220]" value="en">English</option>
              <option className="bg-[#081220]" value="es">Español</option>
            </select>
          </label>

          {/* LIVE CLOCK */}
          <div className="hidden xl:flex items-center gap-3">
            <StatusPill label="MOTOR IA ATIVO" tone="emerald" pulse />
            <div className="px-3 py-1.5 rounded-lg bg-[#081220] border border-cyan-500/25 font-mono text-xs text-cyan-300">
              {clock}
            </div>
          </div>
        </div>

        {/* TELEMETRY & SCENARIO INJECTION SUB-BAR */}
        <div className="border-t border-cyan-500/15 bg-[#060d18]/95">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? "PAUSAR SIMULAÇÃO" : "RETOMAR SIMULAÇÃO"}
              </button>

              <div className="flex items-center bg-[#0a1626] rounded border border-cyan-500/20 overflow-hidden">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-1 ${
                      simSpeed === spd ? "bg-cyan-500/25 text-cyan-300 font-bold" : "text-slate-400"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                TELEMETRIA AO VIVO ({128 * simSpeed} PKTS/S)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">INJETAR CENÁRIO:</span>
              <button
                onClick={() => setDeviationActive(!deviationActive)}
                className={`px-2.5 py-1 rounded border transition ${
                  deviationActive
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-slate-800/60 text-slate-400 border-slate-700"
                }`}
              >
                ⚠ Desvio [ARG-02]
              </button>
              <button
                onClick={() => setColdChainAlert(!coldChainAlert)}
                className={`px-2.5 py-1 rounded border transition ${
                  coldChainAlert
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-slate-800/60 text-slate-400 border-slate-700"
                }`}
              >
                ❄ Falha Frio [ARG-05]
              </button>
              <button
                onClick={() => {
                  setDeviationActive(true);
                  setRouteOptimized(false);
                  setVaultLocked(false);
                  setColdChainAlert(false);
                }}
                className="p-1.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
                title="Resetar Cenários"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        {/* ==================== TAB 1: CENTRAL COMMAND ==================== */}
        {activeTab === "COMMAND" && (
          <div className="space-y-6">
            {/* TOP KPI STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 gsap-stagger">
              {[
                { label: "Coletas no Prazo", value: "98.2%", tone: "text-emerald-400" },
                { label: "OTIF Global", value: "96.8%", tone: "text-cyan-400" },
                { label: "Taxa Insucesso", value: "1.1%", tone: "text-amber-400" },
                { label: "Ocupação Frota", value: "89.4%", tone: "text-cyan-300" },
                { label: "Tempo Médio Viagem", value: "3h 42m", tone: "text-slate-200" },
                { label: "Custo / Entrega", value: "R$ 48,90", tone: "text-emerald-300" },
                { label: "KM Improdutivo", value: "3.4%", tone: "text-violet-400" },
                { label: "Docas Ativas", value: `${docks.filter((d) => d.status === "OCUPADA").length}/10`, tone: "text-amber-300" },
              ].map((kpi, idx) => (
                <SpotlightCard key={idx} className="p-3.5">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">{kpi.label}</div>
                  <div className={`text-xl font-black font-mono mt-1 ${kpi.tone}`}>{kpi.value}</div>
                </SpotlightCard>
              ))}
            </div>

            {/* ARQUITETURA FLUXOGRAMA INTERATIVO ARGOS IA */}
            <SpotlightCard className="p-6 gsap-stagger" accentColor="cyan">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Arquitetura Neural & Fluxo Operacional Integrado
                  </h2>
                  <p className="text-xs text-slate-400">
                    Clique em qualquer módulo do fluxograma para navegar diretamente para sua tela operacional.
                  </p>
                </div>
                <StatusPill label="TOPOLOGIA SINCRONIZADA" tone="cyan" />
              </div>

              <div className="flex flex-col items-center space-y-5">
                {/* Nível 1 */}
                <div className="px-6 py-3 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-center glow-cyan">
                  <div className="text-xs font-mono text-cyan-300">NÚCLEO CORPORATIVO</div>
                  <div className="text-base font-black text-white">ARGOS IA LOGISTIC</div>
                </div>

                <div className="h-5 w-0.5 bg-gradient-to-b from-cyan-400 to-cyan-500/30" />

                {/* Nível 2 */}
                <div className="px-6 py-2.5 rounded-xl bg-[#0c1d33] border border-cyan-500/40 text-center">
                  <div className="text-xs font-mono font-bold text-cyan-200">CENTRAL DE INTELIGÊNCIA</div>
                </div>

                {/* Nível 3: 4 Pilares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {[
                    {
                      title: "ARGOS VISION",
                      sub: "OCR Portaria, Câmeras & Leitura XML/NF-e",
                      target: "PORTARIA_DOCAS" as TabId,
                      color: "border-cyan-500/40 hover:border-cyan-400",
                    },
                    {
                      title: "ARGOS FLEET",
                      sub: "Frota Própria vs Terceirizada & Jornada",
                      target: "FLEET_GUARD" as TabId,
                      color: "border-emerald-500/40 hover:border-emerald-400",
                    },
                    {
                      title: "ARGOS ROUTE",
                      sub: "Malha de Tráfego, Geofencing & ETA",
                      target: "ROMANEIO" as TabId,
                      color: "border-violet-500/40 hover:border-violet-400",
                    },
                    {
                      title: "ARGOS GUARD",
                      sub: "Escudo Panoptes, Bloqueio & Risco",
                      target: "FLEET_GUARD" as TabId,
                      color: "border-rose-500/40 hover:border-rose-400",
                    },
                  ].map((pillar) => (
                    <button
                      key={pillar.title}
                      onClick={() => setActiveTab(pillar.target)}
                      className={`p-4 rounded-xl bg-[#091628] border ${pillar.color} text-left transition-all hover:-translate-y-1`}
                    >
                      <div className="text-sm font-mono font-bold text-white">{pillar.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{pillar.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Nível 4: Motor de IA */}
                <div className="px-8 py-3 rounded-xl bg-violet-500/15 border border-violet-400/50 text-center shadow-[0_0_25px_rgba(139,92,246,0.2)]">
                  <div className="text-sm font-mono font-black text-violet-200">MOTOR DE IA (COROA NEURAL)</div>
                  <div className="text-[11px] font-mono text-violet-300/80">
                    Triagem Automática • Cálculo ETA • Alocação de 10 Docas • Predição de Sinistros
                  </div>
                </div>

                {/* Nível 5: Saídas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <button
                    onClick={() => setActiveTab("FLEET_GUARD")}
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-center hover:bg-rose-500/20 transition"
                  >
                    <div className="text-xs font-mono font-bold text-rose-300">ALERTAS INTELIGENTES</div>
                    <div className="text-[11px] text-slate-400">Desvios, Paradas Suspeitas & Jammers</div>
                  </button>
                  <button
                    onClick={() => setActiveTab("ROMANEIO")}
                    className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/35 text-center hover:bg-cyan-500/20 transition"
                  >
                    <div className="text-xs font-mono font-bold text-cyan-300">DASHBOARD OPERACIONAL</div>
                    <div className="text-[11px] text-slate-400">Coleta, Romaneio, Viagem & POD</div>
                  </button>
                  <button
                    onClick={() => setActiveTab("XML_TRIAGE")}
                    className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-center hover:bg-emerald-500/20 transition"
                  >
                    <div className="text-xs font-mono font-bold text-emerald-300">DECISÕES AUTOMATIZADAS</div>
                    <div className="text-[11px] text-slate-400">Geração de Tickets, WhatsApp & Liberação de Doca</div>
                  </button>
                </div>
              </div>
            </SpotlightCard>

            {/* RESUMO RÁPIDO DAS RAIAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 gsap-stagger">
              <SpotlightCard className="p-5" accentColor="cyan">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-cyan-400">RAIA 1 & 2 • TRIAGEM XML/NF-e</span>
                  <button onClick={() => setActiveTab("XML_TRIAGE")} className="text-xs font-mono text-cyan-300 underline">
                    Abrir Módulo →
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Recebimento automático de XML/NF-e com identificação instantânea de{" "}
                  <strong className="text-white">Frota Própria</strong> vs{" "}
                  <strong className="text-white">Terceirizada (Cavalo/Carreta)</strong>, cálculo de ETA e disparo de link WhatsApp ao motorista.
                </p>
              </SpotlightCard>

              <SpotlightCard className="p-5" accentColor="emerald">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400">RAIA 4 & 5 • PORTARIA & 10 DOCAS</span>
                  <button onClick={() => setActiveTab("PORTARIA_DOCAS")} className="text-xs font-mono text-emerald-300 underline">
                    Gerenciar Docas →
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Validação via <strong className="text-white">Cerca Eletrônica + OCR de Placa</strong> com marcação automática de entrada e alocação inteligente entre as 10 docas (Recebimento e Coleta).
                </p>
              </SpotlightCard>

              <SpotlightCard className="p-5" accentColor="violet">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-violet-400">OPERACIONAL • ROMANEIO & POD</span>
                  <button onClick={() => setActiveTab("ROMANEIO")} className="text-xs font-mono text-violet-300 underline">
                    Ver Romaneios →
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Controle ponta a ponta de <strong className="text-white">Solicitação → Coleta → Romaneio → Viagem → Entrega</strong> com encerramento automático de ticket sem pendências.
                </p>
              </SpotlightCard>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: TRIAGEM XML / NF-e ==================== */}
        {activeTab === "XML_TRIAGE" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 gsap-stagger">
              <div>
                <h2 className="text-lg font-black text-white tracking-wide">
                  RAIA 1 & 2 — RECEBIMENTO DE XML/NF-e E TRIAGEM AUTOMÁTICA
                </h2>
                <p className="text-xs text-slate-400">
                  Classificação automática de Frota Própria/Terceirizada, Tipo de Operação (Transf/Distrib/Filial/Coleta) e Coleta de Placa/Telefone via WhatsApp.
                </p>
              </div>
              <MagneticButton
                onClick={() => setShowXmlModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(0,240,255,0.35)]"
              >
                <Plus className="w-4 h-4" />
                SIMULAR RECEBIMENTO XML / NF-e
              </MagneticButton>
            </div>

            <div className="grid grid-cols-1 gap-4 gsap-stagger">
              {tickets.map((tk) => (
                <SpotlightCard
                  key={tk.id}
                  className="p-5"
                  accentColor={tk.risco === "ALTO" ? "crimson" : tk.frota === "PROPRIA" ? "cyan" : "amber"}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-cyan-400">{tk.id}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {tk.nfe}
                        </span>
                        <StatusPill
                          label={tk.frota === "PROPRIA" ? "FROTA PRÓPRIA (DA CASA)" : "TERCEIRIZADA"}
                          tone={tk.frota === "PROPRIA" ? "cyan" : "amber"}
                        />
                        <StatusPill label={`OP: ${tk.operacao}`} tone="violet" />
                        <StatusPill
                          label={`RISCO ${tk.risco}`}
                          tone={tk.risco === "ALTO" ? "crimson" : tk.risco === "MEDIO" ? "amber" : "emerald"}
                        />
                      </div>
                      <div className="text-sm font-bold text-white">
                        {tk.cliente} — <span className="text-slate-400 font-normal">{tk.origem} → {tk.destino}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <div className="text-slate-500">CAVALO / CARRETA</div>
                        <div className="text-white font-bold">
                          {tk.cavalo} {tk.carreta ? `/ ${tk.carreta}` : "(Sem Carreta)"}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">MOTORISTA / WHATSAPP</div>
                        <div className="text-slate-200">{tk.motorista}</div>
                        <div className="text-emerald-400 text-[11px]">{tk.telefone}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">CARGA</div>
                        <div className="text-white">{tk.volumes} vol • {tk.pesoKg} kg</div>
                      </div>
                      <div>
                        <div className="text-slate-500">ETA CALCULADO</div>
                        <div className={`font-bold ${tk.risco === "ALTO" ? "text-rose-400" : "text-cyan-300"}`}>
                          {tk.eta}
                        </div>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: OPERAÇÃO & ROMANEIO ==================== */}
        {activeTab === "ROMANEIO" && (
          <div className="space-y-6">
            {/* PIPELINE VISUAL DAS 5 ETAPAS */}
            <SpotlightCard className="p-5 gsap-stagger" accentColor="cyan">
              <h2 className="text-sm font-mono font-bold text-cyan-400 uppercase mb-4">
                Fluxo Operacional: Solicitação → Coleta → Romaneio → Viagem → Entrega
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { step: "1. SOLICITAÇÃO", desc: "Pedido recebido e validado", status: "CONCLUÍDO" },
                  { step: "2. COLETA", desc: "CO-001 (100v) + CO-002 (80v)", status: "COLETADA" },
                  { step: "3. ROMANEIO", desc: "ROM-2026-00125 (1.400 kg)", status: "CONFERIDO" },
                  { step: "4. VIAGEM", desc: "VG-00125 • Teresópolis → RJ", status: "EM TRÂNSITO" },
                  { step: "5. ENTREGA (POD)", desc: "Comprovante e encerramento", status: "EM EXECUÇÃO" },
                ].map((s, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#091628] border border-cyan-500/25">
                    <div className="text-xs font-mono font-bold text-cyan-300">{s.step}</div>
                    <div className="text-xs text-slate-300 mt-1">{s.desc}</div>
                    <div className="mt-2">
                      <StatusPill label={s.status} tone="emerald" />
                    </div>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* DETALHAMENTO DO ROMANEIO ATIVO */}
            {romaneios.map((rom) => (
              <div key={rom.id} className="grid grid-cols-1 lg:grid-cols-2 gap-5 gsap-stagger">
                <SpotlightCard className="p-5" accentColor="violet">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono text-violet-400">AGRUPAMENTO DE CARGAS</span>
                      <h3 className="text-lg font-black text-white">{rom.id} • {rom.viagemId}</h3>
                    </div>
                    <StatusPill label={rom.status} tone="cyan" pulse />
                  </div>
                  <p className="text-xs font-mono text-slate-300 mb-4">
                    Motorista: <strong className="text-white">{rom.motorista}</strong> • Veículo:{" "}
                    <strong className="text-white">{rom.veiculo}</strong> • Rota: {rom.rota}
                  </p>

                  <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase mb-2">
                    Ordens de Coleta Vinculadas
                  </h4>
                  <div className="space-y-2">
                    {rom.coletas.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-[#081322] border border-slate-800 text-xs">
                        <div>
                          <span className="font-mono font-bold text-cyan-400 mr-2">{c.id}</span>
                          <span className="text-white font-semibold">{c.cliente}</span>
                        </div>
                        <div className="font-mono text-slate-300">
                          {c.volumes} vol • {c.peso} kg
                        </div>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-5" accentColor="emerald">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase mb-3">
                    Entregas Programadas & Comprovante Digital (POD)
                  </h4>
                  <div className="space-y-3">
                    {rom.entregas.map((en) => (
                      <div key={en.id} className="p-3.5 rounded-xl bg-[#081322] border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-mono text-emerald-400">{en.id} • {en.volumes} volumes</div>
                          <div className="text-sm font-bold text-white">{en.destino}</div>
                        </div>
                        {en.status === "ENTREGUE" ? (
                          <StatusPill label="POD ASSINADO • ENTREGUE" tone="emerald" />
                        ) : (
                          <button
                            onClick={() => handleCompleteDelivery(rom.id, en.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold hover:bg-emerald-500/30 transition"
                          >
                            Confirmar Entrega (POD)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* MATRIZ DOCUMENTOS OPERACIONAIS X FISCAIS */}
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
                      Conformidade Documental (Operacional vs Fiscal)
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Ordem de Coleta ✓</span>
                      <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">Romaneio ✓</span>
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">NF-e / CT-e / MDF-e ✓</span>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB 4: PORTARIA & 10 DOCAS ==================== */}
        {activeTab === "PORTARIA_DOCAS" && (
          <div className="space-y-6">
            {/* RAIA 4: PORTARIA INTELIGENTE */}
            <SpotlightCard className="p-5 gsap-stagger" accentColor="cyan">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    RAIA 4 • SISTEMA DE PORTARIA (CERCA ELETRÔNICA + OCR)
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Veículo na Cancela: KXP-4B91 (Kassandra Atenas — Ticket TK-9044)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cerca eletrônica detectou aproximação a 50m. Valide a leitura OCR da placa para liberar entrada automática.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {ocrValidated ? (
                    <StatusPill label="ENTRADA LIBERADA VIA OCR • LOGÍSTICA NOTIFICADA" tone="emerald" />
                  ) : (
                    <button
                      onClick={() => setOcrValidated(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-mono text-xs font-bold hover:bg-emerald-400 transition"
                    >
                      VALIDAR OCR & LIBERAR PORTARIA
                    </button>
                  )}
                </div>
              </div>
            </SpotlightCard>

            {/* RAIA 5: GERENCIAMENTO DAS 10 DOCAS */}
            <div className="space-y-4 gsap-stagger">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-white font-mono">
                  RAIA 5 — PAINEL VISUAL DAS 10 DOCAS (RECEBIMENTO & COLETA)
                </h2>
                <div className="flex gap-2 text-xs font-mono">
                  <StatusPill label={`LIVRES: ${docks.filter((d) => d.status === "LIVRE").length}`} tone="emerald" />
                  <StatusPill label={`OCUPADAS: ${docks.filter((d) => d.status === "OCUPADA").length}`} tone="amber" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {docks.map((dock) => (
                  <SpotlightCard
                    key={dock.id}
                    className="p-4 flex flex-col justify-between"
                    accentColor={
                      dock.status === "LIVRE"
                        ? "emerald"
                        : dock.status === "OCUPADA"
                        ? "amber"
                        : "crimson"
                    }
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-black text-white">
                          DOCA {String(dock.id).padStart(2, "0")}
                        </span>
                        <StatusPill
                          label={dock.status}
                          tone={
                            dock.status === "LIVRE"
                              ? "emerald"
                              : dock.status === "OCUPADA"
                              ? "amber"
                              : "crimson"
                          }
                        />
                      </div>

                      <div className="text-[11px] font-mono text-cyan-400 mb-3">
                        POOL: {dock.pool}
                      </div>

                      {dock.status === "OCUPADA" ? (
                        <div className="space-y-2 text-xs">
                          <div className="font-mono font-bold text-white">
                            {dock.placa} • {dock.ticketId}
                          </div>
                          <div className="text-slate-400 text-[11px]">{dock.operacao}</div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                              style={{ width: `${dock.progresso || 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>{dock.progresso}%</span>
                            <span>{dock.tempoRestante}</span>
                          </div>
                        </div>
                      ) : dock.status === "LIVRE" ? (
                        <p className="text-xs text-slate-400">
                          Pronta para alocação imediata via Motor IA.
                        </p>
                      ) : (
                        <p className="text-xs text-rose-300">
                          Niveladora em manutenção preventiva.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      {dock.status === "LIVRE" && (
                        <button
                          onClick={() => handleAllocateDock(dock.id)}
                          className="w-full py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-mono text-xs font-bold hover:bg-cyan-500/25 transition"
                        >
                          + Alocar Veículo
                        </button>
                      )}
                      {dock.status === "OCUPADA" && (
                        <button
                          onClick={() => handleReleaseDock(dock.id)}
                          className="w-full py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-mono text-xs font-bold hover:bg-emerald-500/25 transition"
                        >
                          Liberar Doca & Encerrar
                        </button>
                      )}
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: FLEET, ROUTE & GUARD ==================== */}
        {activeTab === "FLEET_GUARD" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 gsap-stagger">
            {/* COLUNA ESQUERDA: MAPA TÁTICO + MOTORISTAS */}
            <div className="lg:col-span-7 space-y-5">
              <SpotlightCard className="p-5" accentColor="cyan">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-mono font-bold text-white">
                      MALHA TÁTICA ARGOS • CORREDOR SP-RJ (DUTRA)
                    </h3>
                  </div>
                  <StatusPill label="ASTROLÁBIO DIGITAL ATIVO" tone="emerald" />
                </div>

                {/* MAPA SVG INTERATIVO */}
                <div className="relative h-64 rounded-xl bg-[#03070d] border border-cyan-500/25 overflow-hidden p-4">
                  <svg viewBox="0 0 600 220" className="w-full h-full">
                    {/* Rota Homologada */}
                    <path
                      d="M 40 180 Q 220 150, 360 110 T 560 45"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />
                    {/* Rota Otimizada */}
                    {routeOptimized && (
                      <path
                        d="M 40 180 Q 260 190, 410 135 T 560 45"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                      />
                    )}
                    {/* Desvio ARG-02 */}
                    {deviationActive && !routeOptimized && (
                      <path
                        d="M 320 120 L 380 55 L 430 40"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="3"
                      />
                    )}

                    {/* Pontos */}
                    <circle cx="40" cy="180" r="7" fill="#00f0ff" />
                    <text x="25" y="205" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                      CD Cajamar
                    </text>

                    <circle cx="220" cy="148" r="6" fill="#00f0ff" />
                    <text x="195" y="172" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                      S. José
                    </text>

                    <circle cx="380" cy="55" r="8" fill={deviationActive && !routeOptimized ? "#f43f5e" : "#10b981"} />
                    <text x="394" y="58" fill="#ffffff" fontSize="11" fontFamily="monospace">
                      ARG-02 (47 km/h)
                    </text>

                    <circle cx="560" cy="45" r="7" fill="#10b981" />
                    <text x="515" y="30" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                      Galeão RJ
                    </text>
                  </svg>

                  {deviationActive && !routeOptimized && (
                    <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-rose-950/90 border border-rose-500/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-mono text-rose-200">
                        <strong>DESVIO DETECTADO:</strong> ARG-02 (+4.2 km fora do corredor homologado).
                      </div>
                      <button
                        onClick={() => {
                          setRouteOptimized(true);
                          setDeviationActive(false);
                        }}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-mono text-xs font-bold hover:bg-emerald-400"
                      >
                        ENVIAR ROTA OTIMIZADA
                      </button>
                    </div>
                  )}
                </div>
              </SpotlightCard>

              {/* REGULADOR DE JORNADA LEI 13.103/15 */}
              <SpotlightCard className="p-5" accentColor="emerald">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase">
                    Motoristas em Rota & Regulador de Jornada (Lei 13.103/15)
                  </h3>
                  <StatusPill label="TELEMETRIA ON" tone="emerald" />
                </div>
                <div className="space-y-2.5 text-xs font-mono">
                  {[
                    { name: "Marcus Vinicius", id: "ARG-01", time: "4h 38m", status: "DESCANSO OK", score: "98%" },
                    { name: "Helena Sparta", id: "ARG-02", time: "7h 12m", status: "ATENÇÃO", score: "64%" },
                    { name: "Demétrio Pallas", id: "ARG-03", time: "6h 48m", status: "FADIGA ALTA", score: "72%" },
                    { name: "Kassandra Atenas", id: "ARG-04", time: "3h 06m", status: "DESCANSO OK", score: "95%" },
                  ].map((drv) => (
                    <div key={drv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#081322] border border-slate-800">
                      <div>
                        <span className="text-white font-bold">{drv.name}</span>{" "}
                        <span className="text-cyan-400">({drv.id})</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">{drv.time}</span>
                        <span className={drv.status === "DESCANSO OK" ? "text-emerald-400" : "text-amber-400"}>
                          {drv.status}
                        </span>
                        <span className="font-bold text-white">{drv.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </div>

            {/* COLUNA DIREITA: ARGOS GUARD + IA COPILOT */}
            <div className="lg:col-span-5 space-y-5">
              <SpotlightCard className="p-5" accentColor="crimson">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-mono font-bold text-white">
                      ARGOS GUARD • ESCUDO PANOPTES ATIVO
                    </h3>
                  </div>
                  <StatusPill label="1080p LIVE" tone="crimson" pulse />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-[10px]">
                  <div className="p-2.5 rounded-lg bg-[#060c16] border border-slate-800">
                    <div className="text-cyan-400">CAM 01 • RODOVIA</div>
                    <div className="mt-4 text-emerald-400">● STREAM ATIVO</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#060c16] border border-slate-800">
                    <div className="text-cyan-400">CAM 02 • BAÚ</div>
                    <div className="mt-4 text-amber-400">
                      {vaultLocked ? "🔒 TRAVADO" : "🔓 SENSOR OK"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#060c16] border border-slate-800">
                    <div className="text-cyan-400">CAM 03 • CABINE</div>
                    <div className="mt-4 text-emerald-400">● FADIGA IA ON</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <div className="font-mono font-bold text-rose-300">
                      RISCO DE PARADA NÃO AUTORIZADA
                    </div>
                    <div className="text-slate-400">
                      ARG-03: Parada no acostamento fora de ponto homologado.
                    </div>
                  </div>
                  <button
                    onClick={() => setVaultLocked(!vaultLocked)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition ${
                      vaultLocked
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                  >
                    {vaultLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {vaultLocked ? "BAÚ TRAVADO" : "TRAVAR BAÚ REMOTO"}
                  </button>
                </div>
              </SpotlightCard>

              {/* ARGOS INTELLIGENCE COPILOT */}
              <SpotlightCard className="p-5" accentColor="violet">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-mono font-bold text-white">
                      ARGOS INTELLIGENCE • IA COPILOT
                    </h3>
                  </div>
                  <StatusPill label="SINAPSES: 4.096 OPS/S" tone="violet" />
                </div>

                <div className="h-44 overflow-y-auto space-y-2 p-3 rounded-xl bg-[#050a12] border border-violet-500/20 text-xs font-mono mb-3">
                  {copilotMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={msg.startsWith("OPERADOR:") ? "text-cyan-300" : "text-violet-200"}
                    >
                      {msg}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendCopilot} className="flex gap-2">
                  <input
                    type="text"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Pergunte ao Argos Copilot (ex: risco ARG-02, docas)..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#081322] border border-violet-500/30 text-xs text-white focus:outline-none focus:border-violet-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-violet-600 text-white font-mono text-xs font-bold hover:bg-violet-500 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                </form>
              </SpotlightCard>
            </div>
          </div>
        )}
      </main>

      {/* MODAL SIMULAR XML / NF-e */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl glass-panel p-6 border border-cyan-400/40">
            <h3 className="text-base font-mono font-black text-cyan-300 mb-4">
              SIMULAR ENTRADA DE XML / NF-e NA RAIA 1
            </h3>
            <form onSubmit={handleCreateXmlTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Número NF-e</label>
                  <input
                    value={newXmlForm.nfe}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, nfe: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Frota</label>
                  <select
                    value={newXmlForm.frota}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, frota: e.target.value as FleetType })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  >
                    <option value="PROPRIA">Própria (Da Casa)</option>
                    <option value="TERCEIRIZADA">Terceirizada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Operação</label>
                  <select
                    value={newXmlForm.operacao}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, operacao: e.target.value as OperationType })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  >
                    <option value="TRANSF">Transferência</option>
                    <option value="DISTRIB">Distribuição</option>
                    <option value="FILIAL">Filial</option>
                    <option value="COLETA">Coleta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Placa Cavalo</label>
                  <input
                    value={newXmlForm.cavalo}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, cavalo: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Motorista</label>
                  <input
                    value={newXmlForm.motorista}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, motorista: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">WhatsApp Motorista</label>
                  <input
                    value={newXmlForm.telefone}
                    onChange={(e) => setNewXmlForm({ ...newXmlForm, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#07111e] border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowXmlModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold"
                >
                  Gerar Ticket & Disparar Triagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </LocalizedContent>
  );
}
