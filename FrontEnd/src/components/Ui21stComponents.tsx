"use client";
import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Componentes inspirados em 21st.dev (Spotlight Cards, Animated Badges & Magnetic Actions)
 */
export const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  accentColor?: "cyan" | "emerald" | "amber" | "crimson" | "violet";
}> = ({ children, className = "", accentColor = "cyan" }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const colorMap: Record<string, string> = {
    cyan: "rgba(0, 240, 255, 0.16)",
    emerald: "rgba(16, 185, 129, 0.16)",
    amber: "rgba(245, 158, 11, 0.16)",
    crimson: "rgba(244, 63, 94, 0.18)",
    violet: "rgba(139, 92, 246, 0.18)",
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-xl glass-panel transition-all duration-300 hover:border-cyan-400/40 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(450px circle at ${pos.x}px ${pos.y}px, ${colorMap[accentColor]}, transparent 60%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export const StatusPill: React.FC<{
  label: string;
  tone?: "cyan" | "emerald" | "amber" | "crimson" | "violet";
  pulse?: boolean;
}> = ({ label, tone = "cyan", pulse = false }) => {
  const styles: Record<string, string> = {
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    crimson: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/35",
  };

  const dotStyles: Record<string, string> = {
    cyan: "bg-cyan-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    crimson: "bg-rose-400",
    violet: "bg-violet-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider border ${styles[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[tone]} ${pulse ? "animate-ping" : ""}`} />
      {label}
    </span>
  );
};

export const MagneticButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number }
> = ({ children, className = "", strength = 0.25, ...props }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      xTo(relX * strength);
      yTo(relY * strength);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return (
    <button ref={btnRef} className={className} {...props}>
      {children}
    </button>
  );
};
