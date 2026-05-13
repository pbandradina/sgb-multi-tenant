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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGLAS_AFASTAMENTO } from "@/pages/Afastamentos";
import { toast } from "sonner";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABREV = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ─── Ciclo de prontidões ──────────────────────────────────────────────────────
// Ciclo contínuo: referência 01/Jan/2026 = Verde (idx=0)
// Verde → Amarela → Azul → Verde → ... (1 dia cada)
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime(); // 01/Jan/2026 = Verde
const CYCLE: Equipe[] = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];

const CYCLE_COLORS: Record<Equipe, { border: string; text: string; cellBg: string; badgeBg: string; label: string }> = {
  "Prontidão Verde":   { border: "#10b981", text: "#10b981", cellBg: "rgba(16,185,129,0.07)",  badgeBg: "rgba(16,185,129,0.18)", label: "VD" },
  "Prontidão Amarela": { border: "#f59e0b", text: "#f59e0b", cellBg: "rgba(245,158,11,0.07)",  badgeBg: "rgba(245,158,11,0.18)", label: "AM" },
  "Prontidão Azul":    { border: "#3b82f6", text: "#3b82f6", cellBg: "rgba(59,130,246,0.07)",  badgeBg: "rgba(59,130,246,0.18)", label: "AZ" },
  "Administrativo":    { border: "#94a3b8", text: "#94a3b8", cellBg: "rgba(148,163,184,0.07)", badgeBg: "rgba(148,163,184,0.18)", label: "ADM" },
};

// ─── Hierarquia de postos ─────────────────────────────────────────────────────
const POSTO_ORDEM: Record<string, number> = {
  "1º Sargento": 1,
  "2º Sargento": 2,
  "3º Sargento": 3,
  "Cabo":        4,
  "Soldado":     5,
};

const POSTO_ABREV: Record<string, string> = {
  "1º Sargento": "1º Sgt PM",
  "2º Sargento": "2º Sgt PM",
  "3º Sargento": "3º Sgt PM",
  "Cabo":        "Cb PM",
  "Soldado":     "Sd PM",
};

function getPostoAbrev(posto: string): string {
  return POSTO_ABREV[posto] ?? posto;
}

function sortBombeiros<T extends { posto: string; nomeGuerra?: string | null; nome: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ordemA = POSTO_ORDEM[a.posto] ?? 99;
    const ordemB = POSTO_ORDEM[b.posto] ?? 99;
    if (ordemA !== ordemB) return ordemA - ordemB;
    const nomeA = (a.nomeGuerra?.trim() || a.nome).toLowerCase();
    const nomeB = (b.nomeGuerra?.trim() || b.nome).toLowerCase();
    return nomeA.localeCompare(nomeB);
  });
}

function bombeiroLabel(b: { posto: string; nomeGuerra?: string | null; nome: string }): string {
  return `${getPostoAbrev(b.posto)} ${b.nomeGuerra?.trim() || b.nome}`;
}

function getProntidaoDoDia(date: Date): Equipe {
  // Ciclo contínuo: diff em dias a partir de 01/Jan/2026 (Verde)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_MS) / (1000 * 60 * 60 * 24));
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

// Parse de string "YYYY-MM-DD" para Date sem conversão de timezone (evita bug GMT-3)
// new Date('2025-01-01') em GMT-3 = 31/Dez/2024 às 21h — ERRADO
// new Date(2025, 0, 1) = 01/Jan/2025 local — CORRETO
function parseDateLocal(str: string | Date): Date {
  if (str instanceof Date) return new Date(str.getFullYear(), str.getMonth(), str.getDate());
  const parts = str.split('T')[0].split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDayLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}${MESES_ABREV[date.getMonth()]}`;
}

interface ModalState {
  date: Date;
  dateStr: string;
}

export default function Escalas() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedBombeiroId, setSelectedBombeiroId] = useState<number | null>(null);
  const [selectedSigla, setSelectedSigla] = useState<string>("");
  const [periodoConcessao, setPeriodoConcessao] = useState<string>("");
  // Bombeiro selecionado no filtro do cabeçalho
  const [filteredBombeiroId, setFilteredBombeiroId] = useState<number | null>(null);

  // ─── Estado do modal de Troca ─────────────────────────────────────────────
  const [trocaModal, setTrocaModal] = useState(false);
  const [trocaEntraId, setTrocaEntraId] = useState<number | null>(null);
  const [trocaSaiId, setTrocaSaiId] = useState<number | null>(null);
  const [trocaData, setTrocaData] = useState<string>("");
  const [trocaPagamento, setTrocaPagamento] = useState<string>("");
  const [trocaSEI, setTrocaSEI] = useState<string>("");
  const [trocaParte, setTrocaParte] = useState<string>("");

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: bombeiros } = trpc.bombeiro.list.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  const { data: trocasMes, refetch: refetchTrocas } = trpc.troca.list.useQuery(
    { quartelId: quartelId!, ano: year, mes: month },
    { enabled: !!quartelId }
  );

  const { data: afastamentosMes, refetch: refetchAfastamentos } = trpc.afastamento.listByMes.useQuery(
    { quartelId: quartelId!, ano: year, mes: month + 1 },
    { enabled: !!quartelId }
  );

  const utils = trpc.useUtils();

  // Buscar saldo FMO do bombeiro selecionado para auto-preencher o período de concessão
  const { data: saldoFMO } = trpc.fo.saldoBombeiro.useQuery(
    { bombeiroId: selectedBombeiroId!, quartelId: quartelId! },
    { enabled: !!selectedBombeiroId && !!quartelId && selectedSigla === "FMO" }
  );

  // Auto-preencher período de concessão quando saldo FMO carrega e não foi preenchido manualmente
  useEffect(() => {
    if (selectedSigla !== "FMO" || !saldoFMO) return;
    if (periodoConcessao) return; // já preenchido manualmente
    const proxPeriodo = saldoFMO.periodosConcessao[saldoFMO.fmoUsadas];
    if (proxPeriodo) {
      setPeriodoConcessao(`${proxPeriodo.dataInicio} a ${proxPeriodo.dataFim}`);
    }
  }, [saldoFMO, selectedSigla]);

  const createTroca = trpc.troca.create.useMutation({
    onSuccess: () => {
      toast.success("Troca registrada com sucesso!");
      refetchTrocas();
      utils.troca.list.invalidate();
      setTrocaModal(false);
      setTrocaEntraId(null);
      setTrocaSaiId(null);
      setTrocaData("");
      setTrocaPagamento("");
      setTrocaSEI("");
      setTrocaParte("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTroca = trpc.troca.delete.useMutation({
    onSuccess: () => {
      toast.success("Troca removida!");
      refetchTrocas();
      utils.troca.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSaveTroca() {
    if (!trocaEntraId || !trocaSaiId || !trocaData || !quartelId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (trocaEntraId === trocaSaiId) {
      toast.error("Os dois bombeiros devem ser diferentes");
      return;
    }
    createTroca.mutate({
      quartelId,
      bombeiroEntraId: trocaEntraId,
      bombeireSaiId: trocaSaiId,
      dataTroca: trocaData,
      dataPagamento: trocaPagamento || undefined,
      numeroSEI: trocaSEI || undefined,
      numeroParte: trocaParte || undefined,
    });
  }

  const createAfastamento = trpc.afastamento.create.useMutation({
    onSuccess: () => {
      toast.success("Afastamento registrado!");
      refetchAfastamentos();
      utils.afastamento.listByMes.invalidate();
      setModal(null);
      setSelectedBombeiroId(null);
      setSelectedSigla("");
      setPeriodoConcessao("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAfastamento = trpc.afastamento.delete.useMutation({
    onSuccess: () => {
      toast.success("Afastamento removido!");
      refetchAfastamentos();
      utils.afastamento.listByMes.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Mapa: equipe → data de início mais antiga
  const equipeDataInicio = useMemo(() => {
    const map: Record<string, Date> = {};
    if (!bombeiros) return map;
    for (const b of bombeiros) {
      if (b.equipe === "Administrativo") continue;
      const d = parseDateLocal(b.dataInicio); // usa parseDateLocal para evitar bug GMT-3
      if (!map[b.equipe] || d < map[b.equipe]) map[b.equipe] = d;
    }
    return map;
  }, [bombeiros]);

  // Mapa: "YYYY-MM-DD" → afastamentos do dia
  const afastamentosPorDia = useMemo(() => {
    const map: Record<string, Array<{ bombeiroNome: string; sigla: string; cor: string; afastamentoId: number; periodoConcessao?: string }>> = {};
    if (!afastamentosMes || !bombeiros) return map;
    for (const item of afastamentosMes) {
      const af = (item as any).afastamento;
      const bom = (item as any).bombeiro;
      if (!af || !bom) continue;
      const inicio = parseDateLocal(af.dataInicio); // parseDateLocal evita bug GMT-3
      const fim = parseDateLocal(af.dataFim);
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
          afastamentoId: af.id,
          periodoConcessao: af.periodoConcessao ?? undefined,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [afastamentosMes, bombeiros, year, month]);

  // Mapa de trocas por data (YYYY-MM-DD) para indicador visual no calendário
  const trocasPorData = useMemo(() => {
    const map: Record<string, { entra: string; sai: string }[]> = {};
    (trocasMes || []).forEach(t => {
      if (!t.dataTroca) return;
      const ds = toDateStr(parseDateLocal(t.dataTroca as any));
      if (!map[ds]) map[ds] = [];
      const nomeEntra = t.bombeiroEntra?.nomeGuerra || t.bombeiroEntra?.nome || 'Desconhecido';
      const nomeSai = t.bombeireSai?.nomeGuerra || t.bombeireSai?.nome || 'Desconhecido';
      map[ds].push({ entra: nomeEntra, sai: nomeSai });
    });
    return map;
  }, [trocasMes]);

  // Dias do calendário
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

  // Contagem por prontidão no mês
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

  function handleCellClick(date: Date) {
    setModal({ date, dateStr: toDateStr(date) });
    // Pré-selecionar o bombeiro filtrado no modal
    setSelectedBombeiroId(filteredBombeiroId);
    setSelectedSigla("");
    setPeriodoConcessao("");
  }

  function handleSaveAfastamento() {
    if (!selectedBombeiroId || !selectedSigla || !quartelId) {
      toast.error("Selecione o bombeiro e a sigla");
      return;
    }
    createAfastamento.mutate({
      quartelId,
      bombeiroId: selectedBombeiroId,
      tipo: selectedSigla as any,
      dataInicio: modal!.dateStr,
      dataFim: modal!.dateStr,
      periodoConcessao: selectedSigla === "FMO" && periodoConcessao ? periodoConcessao : undefined,
    });
  }

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  // Bombeiros da prontidão do dia selecionado (para sugerir no modal)
  const prontidaoDoModal = modal ? getProntidaoDoDia(modal.date) : null;
  const bombeirosDoProntidao = bombeiros?.filter(b => b.equipe === prontidaoDoModal) ?? [];
  const outrosBombeiros = bombeiros?.filter(b => b.equipe !== prontidaoDoModal && b.equipe !== "Administrativo") ?? [];

  return (
    <AppLayout title="Escalas de Serviço">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Navegação de mês */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="border-border">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground min-w-[160px] text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {MESES[month]} {year}
              </h2>
              <Button variant="outline" size="sm" onClick={nextMonth} className="border-border">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {/* Seletor de bombeiro */}
            {bombeiros && bombeiros.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground min-w-[200px] cursor-pointer"
                  value={filteredBombeiroId ?? ""}
                  onChange={e => setFilteredBombeiroId(Number(e.target.value) || null)}
                >
                  <option value="">Todos os bombeiros</option>
                  {sortBombeiros(bombeiros)
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {bombeiroLabel(b)}
                      </option>
                    ))}
                </select>
                {filteredBombeiroId && (
                  <button
                    onClick={() => setFilteredBombeiroId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border"
                    title="Limpar filtro"
                  >
                    × Limpar
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Botão Nova Troca */}
          <Button
            variant="outline"
            size="sm"
            className="border-border gap-2"
            onClick={() => { setTrocaModal(true); setTrocaData(toDateStr(new Date(year, month, 1))); }}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Nova Troca
          </Button>
          {/* Legenda */}
          <div className="flex items-center gap-3 flex-wrap">
            {CYCLE.map(eq => {
              const c = CYCLE_COLORS[eq];
              const count = countByProntidao[eq] ?? 0;
              return (
                <div key={eq} className="flex items-center gap-1.5">
                  <div className="w-3 h-4 rounded-sm border-2" style={{ backgroundColor: c.badgeBg, borderColor: c.border }} />
                  <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
                  {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grade do calendário */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-border">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/20">
                {d}
              </div>
            ))}
          </div>
          {/* Células dos dias */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ day, prontidao, date }, idx) => {
              const isToday = day !== null && date !== null &&
                today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const colors = prontidao ? CYCLE_COLORS[prontidao] : null;

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

              // Quando há filtro de bombeiro, mostrar apenas os afastamentos dele
              const todasSiglasDoDia = date ? (afastamentosPorDia[toDateStr(date)] ?? []) : [];
              const bombeiroFiltrado = filteredBombeiroId ? bombeiros?.find(b => b.id === filteredBombeiroId) : null;
              const siglasDoDia = filteredBombeiroId
                ? todasSiglasDoDia.filter(s => {
                    const bom = bombeiros?.find(b => b.nome.trim() === s.bombeiroNome.trim());
                    return bom?.id === filteredBombeiroId;
                  })
                : todasSiglasDoDia;

              // Quando há filtro, destacar apenas os dias da equipe do bombeiro selecionado
              const hasBombeiroAtivoFiltrado = filteredBombeiroId
                ? (bombeiroFiltrado && prontidao === bombeiroFiltrado.equipe && hasBombeiroAtivo)
                : hasBombeiroAtivo;

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] border-b border-r border-border/40 last:border-r-0 flex flex-col items-center pt-2 px-1 pb-1 relative",
                    !day && "bg-secondary/5",
                    day && "cursor-pointer hover:brightness-110 transition-all",
                  )}
                  style={hasBombeiroAtivoFiltrado && colors ? { backgroundColor: colors.cellBg } : undefined}
                  onClick={date && day ? () => handleCellClick(date) : undefined}
                >
              {day && colors && (
                <>
                  {/* Indicador de troca no canto superior direito */}
                  {date && trocasPorData[toDateStr(date)] && (
                    <div
                      className="absolute top-1 right-1 flex items-center gap-0.5"
                      title={trocasPorData[toDateStr(date)].map(t => `⇄ ${t.entra} ↔ ${t.sai}`).join('\n')}
                    >
                      <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                    </div>
                  )}
                  {/* Número do dia */}
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
                  {/* Sigla da prontidão (pequena, abaixo do número) — só se não houver afastamento */}
                  {hasBombeiroAtivoFiltrado && siglasDoDia.length === 0 && (
                    <span className="text-[8px] font-bold mt-0.5 leading-none" style={{ color: colors.text }}>
                      {colors.label}
                    </span>
                  )}
                  {/* Siglas de afastamentos — sempre visíveis, independente da equipe */}
                  {siglasDoDia.length > 0 ? (
                    <div className="w-full mt-1 flex flex-col gap-0.5 items-center">
                      {siglasDoDia.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-0">
                          <span
                            title={item.sigla === 'FMO' && item.periodoConcessao
                              ? `${item.bombeiroNome} — FMO (período: ${item.periodoConcessao})`
                              : `${item.bombeiroNome} — ${item.sigla}`}
                            className={`inline-flex items-center justify-center rounded text-[9px] font-black px-1.5 py-0.5 leading-none ${item.cor}`}
                          >
                            {item.sigla}
                          </span>
                          {item.periodoConcessao && (
                            <span
                              className="text-[8px] font-bold leading-tight text-center mt-0.5"
                              style={{ color: '#a855f7', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={item.periodoConcessao}
                            >
                              {item.periodoConcessao}
                            </span>
                          )}
                        </div>
                      ))}
                      {siglasDoDia.length > 3 && (
                        <span className="text-[8px] text-muted-foreground font-medium">+{siglasDoDia.length - 3}</span>
                      )}
                    </div>
                  ) : hasBombeiroAtivoFiltrado && (
                    // Quando não há afastamento, mostrar sigla da equipe abaixo do número
                    // (já renderizado acima, este bloco é apenas placeholder)
                    null
                  )}
                </>
              )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Legenda de siglas */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legenda de Afastamentos</p>
            <div className="flex flex-wrap gap-1.5">
              {SIGLAS_AFASTAMENTO.map(s => (
                <span key={s.sigla} title={s.label} className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold", s.cor)}>
                  {s.sigla} <span className="font-normal opacity-80 hidden sm:inline">— {s.label}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <span className="text-muted-foreground mt-0.5 flex-shrink-0 text-sm">ℹ</span>
          <p className="text-xs text-muted-foreground">
            Ciclo contínuo: <strong style={{ color: CYCLE_COLORS["Prontidão Verde"].text }}>VD</strong> (01/Jan/2026) { }
            <strong style={{ color: CYCLE_COLORS["Prontidão Amarela"].text }}>AM</strong> (02/Jan) { }
            <strong style={{ color: CYCLE_COLORS["Prontidão Azul"].text }}>AZ</strong> (03/Jan) → repetindo.
            Clique em qualquer dia para registrar um afastamento diretamente na célula.
          </p>
        </div>

        {/* Tabela de Trocas de Serviço do Mês */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Alterações de Escala / Trocas de Serviço — {MESES[month]}/{year}</p>
              </div>
              <Button variant="outline" size="sm" className="border-border gap-1.5 text-xs" onClick={() => { setTrocaModal(true); setTrocaData(toDateStr(new Date(year, month, 1))); }}>
                <ArrowLeftRight className="w-3 h-3" /> Nova Troca
              </Button>
            </div>
            {!trocasMes || trocasMes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma troca registrada neste mês.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-semibold uppercase tracking-wide">Data</th>
                      <th className="text-left py-2 px-3 font-semibold uppercase tracking-wide" style={{ color: '#22c55e' }}>Entra</th>
                      <th className="text-left py-2 px-3 font-semibold uppercase tracking-wide" style={{ color: '#ef4444' }}>Sai</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-semibold uppercase tracking-wide">SEI</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-semibold uppercase tracking-wide">Parte Nº</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-semibold uppercase tracking-wide">Pagamento</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trocasMes.map((t, idx) => {
                      const dataFmt = t.dataTroca ? formatDayLabel(parseDateLocal(t.dataTroca as any)) : "-";
                      const pagFmt = t.dataPagamento ? formatDayLabel(parseDateLocal(t.dataPagamento as any)) : "-";
                      const entraLabel = t.bombeiroEntra ? bombeiroLabel(t.bombeiroEntra) : `#${t.bombeiroEntraId}`;
                      const saiLabel = t.bombeireSai ? bombeiroLabel(t.bombeireSai) : `#${t.bombeireSaiId}`;
                      return (
                        <tr key={t.id} className={cn("border-b border-border/40 hover:bg-secondary/20 transition-colors", idx % 2 === 0 ? "" : "bg-secondary/10")}>
                          <td className="py-2 px-3 font-bold text-foreground">{dataFmt}</td>
                          <td className="py-2 px-3" style={{ color: '#22c55e', fontWeight: 600 }}>{entraLabel}</td>
                          <td className="py-2 px-3" style={{ color: '#ef4444', fontWeight: 600 }}>{saiLabel}</td>
                          <td className="py-2 px-3 text-muted-foreground">{t.numeroSEI || "-"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{t.numeroParte || "-"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{pagFmt}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => { if (confirm(`Remover troca de ${dataFmt}?`)) deleteTroca.mutate({ id: t.id, quartelId: quartelId! }); }}
                              className="text-destructive hover:text-destructive/80 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                              title="Remover troca"
                            >✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Modal de inserção de afastamento */}
      <Dialog open={!!modal} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Selecione a sigla para {modal ? formatDayLabel(modal.date) : ""}:
            </DialogTitle>
          </DialogHeader>

          {/* Afastamentos já registrados no dia — com opção de excluir */}
          {modal && (() => {
            const afastamentosDoDia = afastamentosMes?.filter(item => {
              const af = (item as any).afastamento ?? item;
              const ini = parseDateLocal(af.dataInicio as any);
              const fim = parseDateLocal(af.dataFim as any);
              const d = modal.date;
              return d >= ini && d <= fim;
            }) ?? [];
            if (afastamentosDoDia.length === 0) return null;
            return (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Afastamentos registrados neste dia</p>
                <div className="flex flex-col gap-1">
                  {afastamentosDoDia.map((item, idx) => {
                    const af = (item as any).afastamento ?? item;
                    const bom = bombeiros?.find(b => b.id === af.bombeiroId);
                    const siglaConfig = SIGLAS_AFASTAMENTO.find(s => s.sigla === af.tipo);
                    return (
                      <div key={af.id ?? idx} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black leading-none", siglaConfig?.cor ?? "bg-slate-700 text-white")}>
                            {af.tipo}
                          </span>
                          <span className="text-xs text-foreground">{bom?.nome ?? `Bombeiro #${af.bombeiroId}`}</span>
                          {af.periodoConcessao && (
                            <span className="text-[10px] text-purple-400">{af.periodoConcessao}</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Remover ${af.tipo} de ${bom?.nome ?? 'bombeiro'}?`)) {
                              deleteAfastamento.mutate({ id: af.id, quartelId: quartelId! });
                            }
                          }}
                          className="text-destructive hover:text-destructive/80 text-xs font-bold px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
                          title="Remover afastamento"
                        >
                          ✕ Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-2" />
              </div>
            );
          })()}

          {/* Grid de siglas — igual ao print de referência */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {SIGLAS_AFASTAMENTO.map(s => (
              <button
                key={s.sigla}
                onClick={() => { setSelectedSigla(s.sigla); if (s.sigla !== 'FMO') setPeriodoConcessao(''); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border-2 transition-all text-left",
                  selectedSigla === s.sigla
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent",
                  "bg-secondary/40 text-foreground hover:bg-secondary/70"
                )}
              >
                <span className={cn("inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black leading-none flex-shrink-0", s.cor)}>
                  {s.sigla}
                </span>
                <span className="text-xs">{s.label}</span>
              </button>
            ))}
            {/* Opção Limpar seleção */}
            <button
              onClick={() => { setSelectedSigla(''); setPeriodoConcessao(''); }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border-2 transition-all text-left col-span-2",
                selectedSigla === ''
                  ? "border-destructive ring-2 ring-destructive/30"
                  : "border-transparent",
                "bg-secondary/20 text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black leading-none flex-shrink-0 bg-slate-700 text-slate-300">
                ✕
              </span>
              <span className="text-xs">Limpar seleção</span>
            </button>
          </div>

          {/* Seletor de bombeiro */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bombeiro</label>
            <select
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              value={selectedBombeiroId ?? ""}
              onChange={e => setSelectedBombeiroId(Number(e.target.value) || null)}
            >
              <option value="">Selecione o bombeiro...</option>
              {/* Bombeiros da prontidão do dia em destaque */}
              {bombeirosDoProntidao.length > 0 && (
                <optgroup label={`Prontidão do dia (${prontidaoDoModal?.replace("Prontidão ", "")})`}>
                  {sortBombeiros(bombeirosDoProntidao).map(b => (
                    <option key={b.id} value={b.id}>{bombeiroLabel(b)}</option>
                  ))}
                </optgroup>
              )}
              {outrosBombeiros.length > 0 && (
                <optgroup label="Outras prontidões">
                  {sortBombeiros(outrosBombeiros).map(b => (
                    <option key={b.id} value={b.id}>{bombeiroLabel(b)} ({b.equipe.replace("Prontidão ", "")})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Campo período de concessão (apenas para FMO) */}
          {selectedSigla === "FMO" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                Período de concessão
                {saldoFMO && periodoConcessao && (
                  <span className="text-[10px] text-purple-400 font-medium">(preenchido automaticamente)</span>
                )}
              </label>
              <input
                type="text"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                placeholder={saldoFMO?.periodosConcessao?.length ? `Ex: ${saldoFMO.periodosConcessao[0]?.dataInicio} a ${saldoFMO.periodosConcessao[0]?.dataFim}` : "Ex: 01FEV a 09FEV"}
                value={periodoConcessao}
                onChange={e => setPeriodoConcessao(e.target.value)}
              />
              {saldoFMO && saldoFMO.saldoFMO <= 0 && (
                <p className="text-[10px] text-amber-400">Atenção: este bombeiro não tem saldo de FMO disponível.</p>
              )}
            </div>
          )}

          {/* Botão de confirmar */}
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSaveAfastamento}
            disabled={createAfastamento.isPending || !selectedBombeiroId || !selectedSigla}
          >
            {createAfastamento.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Registrar Afastamento
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Troca de Serviço */}
      <Dialog open={trocaModal} onOpenChange={(open) => { if (!open) setTrocaModal(false); }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              Registrar Troca de Serviço
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Data da Troca */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data da Troca <span className="text-destructive">*</span></label>
              <input
                type="date"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                value={trocaData}
                onChange={e => setTrocaData(e.target.value)}
              />
            </div>

            {/* Quem Entra / Quem Sai */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: '#22c55e' }}>Entra (assume o serviço) <span className="text-destructive">*</span></label>
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  value={trocaEntraId ?? ""}
                  onChange={e => setTrocaEntraId(Number(e.target.value) || null)}
                >
                  <option value="">Selecione...</option>
                  {sortBombeiros(bombeiros ?? []).map(b => (
                    <option key={b.id} value={b.id}>{bombeiroLabel(b)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: '#ef4444' }}>Sai (cede o serviço) <span className="text-destructive">*</span></label>
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  value={trocaSaiId ?? ""}
                  onChange={e => setTrocaSaiId(Number(e.target.value) || null)}
                >
                  <option value="">Selecione...</option>
                  {sortBombeiros(bombeiros ?? []).map(b => (
                    <option key={b.id} value={b.id}>{bombeiroLabel(b)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data de Pagamento */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data de Pagamento (compensação)</label>
              <input
                type="date"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                value={trocaPagamento}
                onChange={e => setTrocaPagamento(e.target.value)}
              />
            </div>

            {/* SEI e Parte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nº SEI</label>
                <input
                  type="text"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  placeholder="Ex: 05700631938/2025-69"
                  value={trocaSEI}
                  onChange={e => setTrocaSEI(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Parte Nº</label>
                <input
                  type="text"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  placeholder="Ex: 93"
                  value={trocaParte}
                  onChange={e => setTrocaParte(e.target.value)}
                />
              </div>
            </div>

            {/* Aviso sobre contagem no ciclo */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-primary text-xs mt-0.5">ℹ</span>
              <p className="text-[11px] text-muted-foreground">
                O dia de troca será contado no ciclo de 9 serviços do bombeiro que <strong className="text-green-400">entra</strong>.
                O bombeiro que <strong className="text-red-400">sai</strong> não terá esse dia contado.
              </p>
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveTroca}
              disabled={createTroca.isPending || !trocaEntraId || !trocaSaiId || !trocaData}
            >
              {createTroca.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar Troca
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
