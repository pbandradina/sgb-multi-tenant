import { cn } from "@/lib/utils";

export type Equipe = "Prontidão Verde" | "Prontidão Azul" | "Prontidão Amarela" | "Administrativo";

export const EQUIPES: Equipe[] = ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"];
export const EQUIPES_PRONTIDAO: Equipe[] = ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela"];

const equipeConfig: Record<Equipe, { label: string; shortLabel: string; className: string; color: string }> = {
  "Prontidão Verde":   { label: "Prontidão Verde",   shortLabel: "Verde",      className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40", color: "#10b981" },
  "Prontidão Azul":   { label: "Prontidão Azul",    shortLabel: "Azul",       className: "bg-blue-500/20 text-blue-400 border border-blue-500/40",           color: "#3b82f6" },
  "Prontidão Amarela":{ label: "Prontidão Amarela",  shortLabel: "Amarela",    className: "bg-amber-500/20 text-amber-400 border border-amber-500/40",        color: "#f59e0b" },
  "Administrativo":   { label: "Administrativo",     shortLabel: "Admin",      className: "bg-slate-500/20 text-slate-400 border border-slate-500/40",        color: "#94a3b8" },
};

interface TeamBadgeProps {
  equipe: Equipe;
  className?: string;
  size?: "sm" | "md" | "lg";
  short?: boolean;
}

export function TeamBadge({ equipe, className, size = "md", short = false }: TeamBadgeProps) {
  const config = equipeConfig[equipe] ?? equipeConfig["Administrativo"];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1";
  return (
    <span className={cn("inline-flex items-center rounded font-semibold tracking-wide", config.className, sizeClass, className)}>
      {short ? config.shortLabel : config.label}
    </span>
  );
}

export function getEquipeColor(equipe: Equipe): string {
  return equipeConfig[equipe]?.color ?? "#94a3b8";
}
