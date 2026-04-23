import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGLAS_AFASTAMENTO } from "@/pages/Afastamentos";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Ciclo fixo: Verde=0, Amarela=1, Azul=2
// Referência: 01/Jan/2025 = Verde (índice 0)
const CYCLE_REFERENCE = new Date(2025, 0, 1);
const CYCLE: Equipe[] = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];

const CYCLE_COLORS: Record<Equipe, { border: string; text: string; cellBg: string; badgeBg: string }> = {
  "Prontidão Verde":   { border: "#10b981", text: "#10b981", cellBg: "rgba(16,185,129,0.07)",  badgeBg: "rgba(16,185,129,0.18)" },
  "Prontidão Amarela": { border: "#f59e0b", text: "#f59e0b", cellBg: "rgba(245,158,11,0.07)",  badgeBg: "rgba(245,158,11,0.18)" },
  "Prontidão Azul":    { border: "#3b82f6", text: "#3b82f6", cellBg: "rgba(59,130,246,0.07)",  badgeBg: "rgba(59,130,246,0.18)" },
  "Administrativo":    { border: "#94a3b8", text: "#94a3b8", cellBg: "rgba(148,163,184,0.07)", badgeBg: "rgba(148,163,184,0.18)" },
};

function getProntidaoDoDia(date: Date): Equipe {
  const ref = CYCLE_REFERENCE.getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - ref) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE[idx];
}

function getSiglaColor(sigla: string): string {
  const config = SIGLAS_AFASTAMENTO.find(s => s.sigla === sigla);
  return config?.cor ?? "bg-slate-700 text-white";
}

// Formata data como YYYY-MM-DD para comparação com banco
function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

  // Buscar bombeiros do quartel
  const { data: bombeiros } = trpc.bombeiro.list.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  // Buscar afastamentos do mês atual
  const { data: afastamentosMes } = trpc.afastamento.listByMes.useQuery(
    { quartelId: quartelId!, ano: year, mes: month + 1 },
    { enabled: !!quartelId }
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Mapa: equipe → data de início mais antiga dos bombeiros dessa equipe
  const equipeDataInicio = useMemo(() => {
    const map: Record<string, Date> = {};
    if (!bombeiros) return map;
    for (const b of bombeiros) {
      if (b.equipe === "Administrativo") continue;
      const d = new Date(b.dataInicio);
      if (!map[b.equipe] || d < map[b.equipe]) {
        map[b.equipe] = d;
      }
    }
    return map;
  }, [bombeiros]);

  // Mapa: "YYYY-MM-DD" → [{ bombeiroNome, sigla, cor }]
  // Para cada dia do mês, quais afastamentos existem
  const afastamentosPorDia = useMemo(() => {
    const map: Record<string, Array<{ bombeiroNome: string; sigla: string; cor: string }>> = {};
    if (!afastamentosMes || !bombeiros) return map;

    for (const item of afastamentosMes) {
      const af = (item as any).afastamento;
      const bom = (item as any).bombeiro;
      if (!af || !bom) continue;

      // Iterar cada dia do período do afastamento dentro do mês
      const inicio = new Date(af.dataInicio);
      const fim = new Date(af.dataFim);
      const mesInicio = new Date(year, month, 1);
      const mesFim = new Date(year, month + 1, 0);

      const start = inicio < mesInicio ? mesInicio : inicio;
      const end = fim > mesFim ? mesFim : fim;

      const cur = new Date(start);
      while (cur <= end) {
        const key = toDateStr(cur);
        if (!map[key]) map[key] = [];
        map[key].push({
          bombeiroNome: bom.nome,
          sigla: af.tipo,
          cor: getSiglaColor(af.tipo),
        });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [afastamentosMes, bombeiros, year, month]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number | null; prontidao: Equipe | null; date: Date | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push({ day: null, prontidao: null, date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ day: d, prontidao: getProntidaoDoDia(date), date });
    }
    return days;
  }, [year, month]);

  const today = new Date();

  // Count days per prontidão this month (only from dataInicio onwards)
  const countByProntidao = useMemo(() => {
    const counts: Record<string, number> = { "Prontidão Verde": 0, "Prontidão Amarela": 0, "Prontidão Azul": 0 };
    calendarDays.forEach(({ day, prontidao, date }) => {
      if (!day || !prontidao || !date || prontidao === "Administrativo") return;
      const dataInicio = equipeDataInicio[prontidao];
      if (!dataInicio) return;
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const inicioOnly = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
      if (dateOnly >= inicioOnly) counts[prontidao]++;
    });
    return counts;
  }, [calendarDays, equipeDataInicio]);

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

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
              const count = countByProntidao[eq] ?? 0;
              return (
                <div key={eq} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm border-2" style={{ backgroundColor: c.badgeBg, borderColor: c.border }} />
                  <span className="text-xs text-muted-foreground font-medium">{shortName}</span>
                  {count > 0 && <span className="text-xs text-muted-foreground">({count} dias)</span>}
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
            {calendarDays.map(({ day, prontidao, date }, idx) => {
              const isToday = day !== null && date !== null &&
                today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

              const colors = prontidao ? CYCLE_COLORS[prontidao] : null;

              // Verificar se há bombeiro desta prontidão ativo neste dia
              let hasBombeiroAtivo = false;
              if (date && prontidao && prontidao !== "Administrativo" && equipeDataInicio[prontidao]) {
                const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const inicioOnly = new Date(
                  equipeDataInicio[prontidao].getFullYear(),
                  equipeDataInicio[prontidao].getMonth(),
                  equipeDataInicio[prontidao].getDate()
                );
                hasBombeiroAtivo = dateOnly >= inicioOnly;
              }

              // Afastamentos deste dia
              const siglasDoDia = date ? (afastamentosPorDia[toDateStr(date)] ?? []) : [];

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] border-b border-r border-border/40 last:border-r-0 flex flex-col items-center pt-2 px-1 pb-1 relative",
                    !day && "bg-secondary/5",
                  )}
                  style={hasBombeiroAtivo && colors ? { backgroundColor: colors.cellBg } : undefined}
                >
                  {day && colors && (
                    <>
                      {/* Day number with colored border */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 transition-all flex-shrink-0"
                        style={{
                          backgroundColor: isToday ? colors.border : colors.badgeBg,
                          borderColor: colors.border,
                          color: isToday ? "#fff" : colors.text,
                          boxShadow: isToday ? `0 0 0 2px ${colors.border}40` : "none",
                        }}
                      >
                        {day}
                      </div>

                      {/* Siglas de afastamentos */}
                      {siglasDoDia.length > 0 && (
                        <div className="w-full mt-1 flex flex-wrap gap-0.5 justify-center">
                          {siglasDoDia.slice(0, 4).map((item, i) => (
                            <span
                              key={i}
                              title={`${item.bombeiroNome} — ${item.sigla}`}
                              className={`inline-flex items-center justify-center rounded text-[8px] font-black px-1 py-0.5 leading-none ${item.cor}`}
                            >
                              {item.sigla}
                            </span>
                          ))}
                          {siglasDoDia.length > 4 && (
                            <span className="text-[8px] text-muted-foreground font-medium">+{siglasDoDia.length - 4}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <span className="text-muted-foreground mt-0.5 flex-shrink-0 text-sm">ℹ</span>
          <p className="text-xs text-muted-foreground">
            Ciclo fixo: <strong style={{ color: CYCLE_COLORS["Prontidão Verde"].text }}>Verde</strong> → <strong style={{ color: CYCLE_COLORS["Prontidão Amarela"].text }}>Amarela</strong> → <strong style={{ color: CYCLE_COLORS["Prontidão Azul"].text }}>Azul</strong>, a partir de 01/Jan/2025.
            O fundo colorido indica dias de serviço. As siglas de afastamentos aparecem dentro de cada célula.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
