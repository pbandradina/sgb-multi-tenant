import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { EQUIPES_PRONTIDAO, type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, TrendingDown, Minus, RefreshCw, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Cores por equipe
const EQUIPE_COLORS: Record<string, { badge: string; text: string; short: string }> = {
  "Prontidão Verde":   { badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40", text: "text-emerald-400", short: "VD" },
  "Prontidão Amarela": { badge: "bg-amber-500/20 text-amber-400 border border-amber-500/40",       text: "text-amber-400",   short: "AM" },
  "Prontidão Azul":    { badge: "bg-blue-500/20 text-blue-400 border border-blue-500/40",          text: "text-blue-400",    short: "AZ" },
  "Administrativo":    { badge: "bg-slate-500/20 text-slate-400 border border-slate-500/40",       text: "text-slate-400",   short: "ADM" },
};

function EquipeBadge({ equipe }: { equipe: string }) {
  const c = EQUIPE_COLORS[equipe] ?? EQUIPE_COLORS["Administrativo"];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none", c.badge)}>
      {c.short}
    </span>
  );
}

// Barra de progresso estilizada
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 100 ? "bg-purple-500" : pct >= 50 ? "bg-blue-500" : "bg-slate-500";
  return (
    <div className="w-full bg-secondary/60 rounded-full h-2 overflow-hidden">
      <div
        className={cn("h-2 rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function FolhasObrigatorias() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState("todas");

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const { data: saldos, isLoading, refetch } = trpc.fo.saldoQuartel.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  // Apenas bombeiros elegíveis (não Administrativo)
  const filtered = (saldos || []).filter((item: any) => {
    if (!item.saldo?.elegivel) return false;
    const nome = item.bombeiro?.nome?.toLowerCase() || "";
    const matchSearch = nome.includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "todas" || item.bombeiro?.equipe === filterEquipe;
    return matchSearch && matchEquipe;
  });

  const totalPositivo = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) > 0).length;
  const totalNegativo = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) < 0).length;
  const totalZerado  = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) === 0).length;

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <AppLayout title="Dashboard de Folgas Obrigatórias">
      <div className="space-y-5">

        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400" style={{ fontFamily: "Montserrat, sans-serif" }}>{totalPositivo}</p>
                <p className="text-xs text-muted-foreground">Saldo positivo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Minus className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>{totalZerado}</p>
                <p className="text-xs text-muted-foreground">Saldo zerado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400" style={{ fontFamily: "Montserrat, sans-serif" }}>{totalNegativo}</p>
                <p className="text-xs text-muted-foreground">Saldo negativo</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {EQUIPES_PRONTIDAO.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => { refetch(); toast.info("Atualizando saldos..."); }}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Dashboard de cards */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                {search || filterEquipe !== "todas"
                  ? "Nenhum bombeiro encontrado com os filtros aplicados."
                  : "Nenhum bombeiro elegível para FMO. Cadastre bombeiros nas prontidões Verde, Azul ou Amarela."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item: any) => {
              const saldo = item.saldo?.saldoFMO ?? 0;
              const conquistadas = item.saldo?.totalFMOGeradas ?? 0;
              const usadas = item.saldo?.fmoUsadas ?? 0;
              const cicloAtual = item.saldo?.saldoCicloAtual ?? 0;
              const previsao: string | null = item.saldo?.previsaoConclusaoCiclo ?? null;
              const equipe: string = item.bombeiro?.equipe ?? "Administrativo";
              const ec = EQUIPE_COLORS[equipe] ?? EQUIPE_COLORS["Administrativo"];

              return (
                <Card
                  key={item.bombeiro.id}
                  className="bg-card border-border hover:border-primary/40 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header do card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{(item.bombeiro as any).nomeGuerra?.trim() || item.bombeiro.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.bombeiro.posto}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <EquipeBadge equipe={equipe} />
                        {/* Saldo badge */}
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-6 rounded text-xs font-bold border",
                          saldo > 0 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : saldo < 0 ? "bg-red-500/15 border-red-500/30 text-red-400"
                          : "bg-secondary border-border text-muted-foreground"
                        )}>
                          {saldo > 0 ? `+${saldo}` : saldo}
                        </span>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="space-y-1.5">
                      {/* Conquistadas */}
                      <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-emerald-500/8 border border-emerald-500/15">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-emerald-300/80">Conquistadas</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">{conquistadas}</span>
                      </div>

                      {/* Usadas */}
                      <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-amber-500/8 border border-amber-500/15">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-xs text-amber-300/80">Usadas</span>
                        </div>
                        <span className="text-sm font-bold text-amber-400">{usadas}</span>
                      </div>

                      {/* Disponível */}
                      <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-blue-500/8 border border-blue-500/15">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className="text-xs text-blue-300/80">Disponível</span>
                        </div>
                        <span className="text-sm font-bold text-blue-400">{Math.max(0, saldo)}</span>
                      </div>
                    </div>

                    {/* Progresso do ciclo atual */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Progresso</span>
                        <span className="text-[11px] font-semibold text-muted-foreground">{cicloAtual}/9</span>
                      </div>
                      <ProgressBar value={cicloAtual} max={9} />
                    </div>

                    {/* Previsão de conclusão do ciclo */}
                    {equipe !== "Administrativo" && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground">Previsão conclusão</span>
                        {cicloAtual === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">ciclo zerado</span>
                        ) : cicloAtual >= 9 ? (
                          <span className="text-[11px] font-semibold text-emerald-400">ciclo completo ✓</span>
                        ) : previsao ? (
                          <span className="text-[11px] font-semibold text-blue-400">{previsao}</span>
                        ) : (
                          <span className="text-[11px] text-amber-400 italic">interrompido</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <span className="text-muted-foreground mt-0.5 flex-shrink-0 text-sm">ℹ</span>
          <p className="text-xs text-muted-foreground">
            A cada <strong>9 serviços consecutivos</strong> sem afastamento interruptor, o bombeiro conquista 1 FMO.
            Afastamentos que interrompem a sequência: <strong>F, LP, LT, DS, D, LTS, C, CFS, CAS, EAP, TAF</strong>.
            O campo <strong>Progresso</strong> mostra quantos serviços o bombeiro já acumulou no ciclo atual (de 0 a 9).
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
