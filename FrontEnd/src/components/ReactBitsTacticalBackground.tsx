"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface NodePoint {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  isHub: boolean;
  pulsePhase: number;
}

interface DataPacket {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

/**
 * Background inspirado em ReactBits + 21st.dev
 * Renderiza malha logística magnética interativa ao cursor, spotlight GSAP e pacotes de telemetria em tempo real.
 */
export const ReactBitsTacticalBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const spotlight = spotlightRef.current;
    if (!canvas || !spotlight) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: -1000, y: -1000, active: false };

    const xTo = gsap.quickTo(spotlight, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(spotlight, "y", { duration: 0.45, ease: "power3.out" });

    const spacing = 85;
    let nodes: NodePoint[] = [];
    let packets: DataPacket[] = [];

    const spawnPacket = () => {
      if (nodes.length < 2) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      const candidates = nodes
        .map((n, idx) => ({
          idx,
          dist: Math.hypot(n.baseX - nodes[fromIdx].baseX, n.baseY - nodes[fromIdx].baseY),
        }))
        .filter((item) => item.idx !== fromIdx && item.dist < spacing * 1.6);

      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        packets.push({
          fromIdx,
          toIdx: target.idx,
          progress: 0,
          speed: 0.006 + Math.random() * 0.008,
          color: Math.random() > 0.35 ? "#00f0ff" : "#10b981",
        });
      }
    };

    const initGrid = () => {
      nodes = [];
      packets = [];
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const jitterX = (Math.random() - 0.5) * 24;
          const jitterY = (Math.random() - 0.5) * 24;
          const bx = i * spacing + jitterX;
          const by = j * spacing + jitterY;
          nodes.push({
            x: bx,
            y: by,
            baseX: bx,
            baseY: by,
            vx: 0,
            vy: 0,
            isHub: Math.random() > 0.86,
            pulsePhase: Math.random() * Math.PI * 2,
          });
        }
      }

      for (let k = 0; k < 22; k++) {
        spawnPacket();
      }
    };

    initGrid();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      xTo(e.clientX - 300);
      yTo(e.clientY - 300);
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Atração magnética suave dos nós próximos ao cursor
      const interactionRadius = 215;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.hypot(dx, dy);

        if (mouse.active && dist < interactionRadius && dist > 1) {
          const force = (1 - dist / interactionRadius) * 0.14;
          node.vx += (dx / dist) * force * 4;
          node.vy += (dy / dist) * force * 4;
        }

        node.vx += (node.baseX - node.x) * 0.045;
        node.vy += (node.baseY - node.y) * 0.045;
        node.vx *= 0.85;
        node.vy *= 0.85;

        node.x += node.vx;
        node.y += node.vy;
      }

      // 2. Conexões da malha logística
      const maxConnectDist = spacing * 1.45;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);

          if (dist < maxConnectDist) {
            const distToMouse = Math.hypot(
              (a.x + b.x) / 2 - mouse.x,
              (a.y + b.y) / 2 - mouse.y
            );
            const highlight =
              mouse.active && distToMouse < 220
                ? (1 - distToMouse / 220) * 0.45
                : 0;

            const baseAlpha = (1 - dist / maxConnectDist) * 0.14;
            ctx.strokeStyle =
              highlight > 0.05
                ? `rgba(0, 240, 255, ${baseAlpha + highlight})`
                : `rgba(22, 48, 75, ${baseAlpha * 2.2})`;
            ctx.lineWidth = highlight > 0.15 ? 1.25 : 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 3. Pacotes de telemetria trafegando nas rotas
      for (let p = packets.length - 1; p >= 0; p--) {
        const pkt = packets[p];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(p, 1);
          spawnPacket();
          continue;
        }

        const from = nodes[pkt.fromIdx];
        const to = nodes[pkt.toIdx];
        if (!from || !to) continue;

        const px = from.x + (to.x - from.x) * pkt.progress;
        const py = from.y + (to.y - from.y) * pkt.progress;

        ctx.shadowBlur = 10;
        ctx.shadowColor = pkt.color;
        ctx.fillStyle = pkt.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. Nós e radares de hub
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const distToMouse = Math.hypot(node.x - mouse.x, node.y - mouse.y);
        const nearCursor = mouse.active && distToMouse < 200;

        if (node.isHub || nearCursor) {
          const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.5 + 0.5;
          ctx.fillStyle = nearCursor
            ? "rgba(0, 240, 255, 0.92)"
            : `rgba(16, 185, 129, ${0.35 + pulse * 0.45})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nearCursor ? 2.8 : 2.1, 0, Math.PI * 2);
          ctx.fill();

          if (nearCursor) {
            ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 7.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = "rgba(22, 48, 75, 0.75)";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#04080f]">
      <div className="absolute inset-0 tactical-grid opacity-75" />
      <div
        ref={spotlightRef}
        className="absolute h-[600px] w-[600px] rounded-full opacity-35 blur-3xl transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(0,240,255,0.18) 0%, rgba(16,185,129,0.08) 45%, transparent 70%)",
        }}
      />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-violet-600/10 blur-[130px]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#04080f_95%)]" />
    </div>
  );
};
