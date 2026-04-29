import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge } from "@/components/TeamBadge";
import { Loader2, Users, AlertTriangle, TrendingUp, Clock, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Ciclo de prontidões: referência 01/Jan/2026 = Verde
const CYCLE_EQUIPES = ['Prontidão Verde', 'Prontidão Amarela', 'Prontidão Azul'] as const;
const CYCLE_REFERENCE = new Date(2026, 0, 1).getTime(); // 01/Jan/2026 local

function getProntidaoHoje(): string {
  const hoje = new Date();
  const hojeMs = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const diffDays = Math.round((hojeMs - CYCLE_REFERENCE) / 86400000);
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

export default function Dashboard() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId, quartelNome } = useQuartel();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!loading && isAuthenticated && !quartelId) {
      navigate("/selecionar-quartel");
    }
  }, [loading, isAuthenticated, quartelId, navigate]);

  const { data: bombeiros, isLoading: loadingBombeiros } = trpc.bombeiro.list.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  const { data: afastamentosAtivos, isLoading: loadingAfastamentos } = trpc.afastamento.listAtivos.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  const { data: saldosFO, isLoading: loadingFO } = trpc.fo.saldoQuartel.useQuery(
    { quartelId: quartelId! },
    { enabled: !!quartelId }
  );

  if (loading || !quartelId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalBombeiros = bombeiros?.length || 0;
  const porEquipe: Record<string, number> = { "Prontidão Verde": 0, "Prontidão Azul": 0, "Prontidão Amarela": 0, "Administrativo": 0 };
  bombeiros?.forEach(b => { if (b.equipe in porEquipe) porEquipe[b.equipe]++; });

  const totalAfastados = afastamentosAtivos?.length || 0;

  // Presentes Hoje: apenas bombeiros da equipe de prontidão do dia, sem afastamento ativo hoje
  const prontidaoHoje = getProntidaoHoje();
  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const afastadosHojeIds = new Set(
    (afastamentosAtivos || []).map((item: any) => item.bombeiro.id)
  );
  const bombeirosDaEquipeHoje = (bombeiros || []).filter(b => b.equipe === prontidaoHoje);
  const efetivoPresenteHoje = bombeirosDaEquipeHoje.filter(b => !afastadosHojeIds.has(b.id)).length;

  // Bombeiros com FO negativo (devendo FO)
  const comFONegativo = saldosFO?.filter(s => s.saldo.saldoFMO < 0) || [];
  const comFOAlto = saldosFO?.filter(s => s.saldo.saldoFMO >= 3) || [];

  return (
    <AppLayout title={`Dashboard — ${quartelNome}`}>
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Efetivo</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {loadingBombeiros ? <Loader2 className="w-6 h-6 animate-spin" /> : totalBombeiros}
              </p>
              <p className="text-xs text-muted-foreground mt-1">bombeiros cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Presentes Hoje</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {loadingBombeiros || loadingAfastamentos ? <Loader2 className="w-6 h-6 animate-spin" /> : efetivoPresenteHoje}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <TeamBadge equipe={prontidaoHoje as any} size="sm" short />
                <p className="text-xs text-muted-foreground">de {bombeirosDaEquipeHoje.length} na {prontidaoHoje.replace('Prontidão ', '')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Afastados</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <UserX className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {loadingAfastamentos ? <Loader2 className="w-6 h-6 animate-spin" /> : totalAfastados}
              </p>
              <p className="text-xs text-muted-foreground mt-1">afastamentos ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FO Pendentes</span>
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {loadingFO ? <Loader2 className="w-6 h-6 animate-spin" /> : comFOAlto.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">bombeiros com FO ≥ 3</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por equipe */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Distribuição por Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"] as const).map(equipe => {
                const count = porEquipe[equipe] ?? 0;
                const pct = totalBombeiros > 0 ? Math.round((count / totalBombeiros) * 100) : 0;
                const color = equipe === "Prontidão Verde" ? "#10b981" : equipe === "Prontidão Azul" ? "#3b82f6" : equipe === "Prontidão Amarela" ? "#f59e0b" : "#94a3b8";
                const shortName = equipe === "Administrativo" ? "Admin" : equipe.replace("Prontidão ", "");
                return (
                  <div key={equipe} className="flex items-center gap-3">
                    <TeamBadge equipe={equipe} size="sm" short />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{shortName}</span>
                        <span className="text-foreground font-medium">{count} bombeiros</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Afastamentos ativos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Afastamentos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAfastamentos ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : !afastamentosAtivos || afastamentosAtivos.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Nenhum afastamento ativo</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {afastamentosAtivos.map((item: any) => (
                    <div key={item.afastamento.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.bombeiro.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.afastamento.tipo.replace(/_/g, " ")} · até{" "}
                          {new Date(item.afastamento.dataFim).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <TeamBadge equipe={item.bombeiro.equipe} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saldos FO */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Saldo de Folgas Mensais Obrigatórias (FMO)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFO ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : !saldosFO || saldosFO.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhum bombeiro cadastrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {saldosFO.map(({ bombeiro, saldo }) => (
                  <div
                    key={bombeiro.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      saldo.saldoFMO >= 3
                        ? "bg-amber-500/10 border-amber-500/30"
                        : saldo.saldoFMO < 0
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{bombeiro.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TeamBadge equipe={bombeiro.equipe as any} size="sm" />
                        <span className="text-xs text-muted-foreground">{bombeiro.posto}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-lg font-bold ${saldo.saldoFMO >= 3 ? "text-amber-400" : saldo.saldoFMO < 0 ? "text-red-400" : "text-emerald-400"}`}
                        style={{ fontFamily: "Montserrat, sans-serif" }}>
                        {saldo.saldoFMO >= 0 ? "+" : ""}{saldo.saldoFMO}
                      </p>
                      <p className="text-xs text-muted-foreground">FMO</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
