import { cn } from "@/lib/utils";

type Equipe = "VD" | "VA" | "VB" | "VC";

const equipeConfig: Record<Equipe, { label: string; className: string }> = {
  VD: { label: "VD", className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" },
  VA: { label: "VA", className: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
  VB: { label: "VB", className: "bg-amber-500/20 text-amber-400 border border-amber-500/40" },
  VC: { label: "VC", className: "bg-red-500/20 text-red-400 border border-red-500/40" },
};

interface TeamBadgeProps {
  equipe: Equipe;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function TeamBadge({ equipe, className, size = "md" }: TeamBadgeProps) {
  const config = equipeConfig[equipe];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1";
  return (
    <span className={cn("inline-flex items-center rounded font-semibold tracking-wide", config.className, sizeClass, className)}>
      {config.label}
    </span>
  );
}

export function getEquipeColor(equipe: Equipe): string {
  const colors: Record<Equipe, string> = {
    VD: "#10b981",
    VA: "#3b82f6",
    VB: "#f59e0b",
    VC: "#ef4444",
  };
  return colors[equipe];
}
