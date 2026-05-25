import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const EQUIPES = ['Prontidão Verde', 'Prontidão Amarela', 'Prontidão Azul'] as const;
export const EQUIPES_PRONTIDAO = EQUIPES; // Alias para FolhasObrigatorias.tsx
export type Equipe = typeof EQUIPES[number] | "Administrativo";

interface TeamBadgeProps {
  equipe: string;
  className?: string;
  size?: "sm" | "md";
}

export function TeamBadge({ equipe, className, size = "md" }: TeamBadgeProps) {
  const getStyles = (nome: string) => {
    const n = (nome || "").toLowerCase();
    if (n.includes("verde")) return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800";
    if (n.includes("amarela")) return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800";
    if (n.includes("azul")) return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-bold uppercase tracking-wider border rounded-full transition-colors shadow-none",
        size === "sm" ? "text-[9px] px-2 py-0" : "text-[10px] px-2.5 py-0.5",
        getStyles(equipe),
        className
      )}
    >
      {equipe}
    </Badge>
  );
}