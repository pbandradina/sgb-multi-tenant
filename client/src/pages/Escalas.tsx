import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth as useAuthHook } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Ciclo fixo: Verde=0, Amarela=1, Azul=2
// 01/Jan/2025 = Verde (dia 0 do ciclo)
// Referência: 01/01/2025 = índice 0 do ciclo
const CYCLE_REFERENCE = new Date(2025, 0, 1); // 01/Jan/2025

const CYCLE: Equipe[] = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];

const CYCLE_COLORS: Record<Equipe, { bg: string; border: string; text: string; dot: string }> = {
  "Prontidão Verde":   { bg: "rgba(16,185,129,0.15)", border: "#10b981", text: "#10b981", dot: "#10b981" },
  "Prontidão Amarela": { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#f59e0b", dot: "#f59e0b" },
  "Prontidão Azul":    { bg: "rgba(59,130,246,0.15)", border: "#3b82f6", text: "#3b82f6", dot: "#3b82f6" },
  "Administrativo":    { bg: "rgba(148,163,184,0.15)", border: "#94a3b8", text: "#94a3b8", dot: "#94a3b8" },
};

/**
 * Retorna a prontidão do ciclo fixo para uma data específica.
 * Ciclo: Verde → Amarela → Azul → Verde → ...
 * Referência: 01/Jan/2025 = Verde (índice 0)
 */
function getProntidaoDoDia(date: Date): Equipe {
  const ref = CYCLE_REFERENCE.getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - ref) / (1000 * 60 * 60 * 24));
  // Garantir índice positivo mesmo para datas antes da referência
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE[idx];
}

export default function Escalas() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar days with prontidão do ciclo
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number | null; prontidao: Equipe | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push({ day: null, prontidao: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ day: d, prontidao: getProntidaoDoDia(date) });
    }
    return days;
  }, [year, month]);

  const today = new Date();

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  // Count days per prontidão this month
  const countByProntidao = useMemo(() => {
    const counts: Record<string, number> = { "Prontidão Verde": 0, "Prontidão Amarela": 0, "Prontidão Azul": 0 };
    calendarDays.forEach(({ day, prontidao }) => {
      if (day && prontidao && prontidao !== "Administrativo") counts[prontidao]++;
    });
    return counts;
  }, [calendarDays]);

  return (
    <AppLayout title="Escalas de Serviço">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth} className="border-border">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {MESES[month]} {year}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth} className="border-border">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {CYCLE.map(eq => {
              const c = CYCLE_COLORS[eq];
              const shortName = eq.replace("Prontidão ", "");
              return (
                <div key={eq} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm border-2" style={{ backgroundColor: c.bg, borderColor: c.border }} />
                  <span className="text-xs text-muted-foreground font-medium">{shortName}</span>
                  <span className="text-xs text-muted-foreground">({countByProntidao[eq]} dias)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar grid */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/20">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ day, prontidao }, idx) => {
              const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const colors = prontidao ? CYCLE_COLORS[prontidao] : null;
              const shortName = prontidao ? prontidao.replace("Prontidão ", "") : "";

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[72px] p-1.5 border-b border-r border-border/40 last:border-r-0 flex flex-col items-center pt-2",
                    !day && "bg-secondary/5",
                    isToday && "bg-primary/5"
                  )}
                >
                  {day && colors && (
                    <>
                      {/* Day number with colored border */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 font-bold text-sm border-2 transition-all"
                        style={{
                          backgroundColor: isToday ? colors.border : colors.bg,
                          borderColor: colors.border,
                          color: isToday ? "#fff" : colors.text,
                          boxShadow: isToday ? `0 0 0 2px ${colors.border}40` : "none",
                        }}
                      >
                        {day}
                      </div>
                      {/* Prontidão label */}
                      <span
                        className="text-[10px] font-semibold tracking-wide leading-none"
                        style={{ color: colors.text }}
                      >
                        {shortName}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground">ℹ</div>
          <p className="text-xs text-muted-foreground">
            O calendário exibe o ciclo fixo de prontidões: <strong style={{ color: CYCLE_COLORS["Prontidão Verde"].text }}>Verde</strong> → <strong style={{ color: CYCLE_COLORS["Prontidão Amarela"].text }}>Amarela</strong> → <strong style={{ color: CYCLE_COLORS["Prontidão Azul"].text }}>Azul</strong>, começando em 01/Jan/2025.
            Os dias de serviço são calculados automaticamente para o cálculo de FMO de cada bombeiro.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
