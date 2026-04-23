import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge, EQUIPES_PRONTIDAO, type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, TrendingDown, Minus, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const utils = trpc.useUtils();
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

  const getSaldoColor = (saldo: number) => {
    if (saldo > 0) return "text-emerald-400";
    if (saldo < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const getSaldoBg = (saldo: number) => {
    if (saldo > 0) return "bg-emerald-500/10 border-emerald-500/20";
    if (saldo < 0) return "bg-red-500/10 border-red-500/20";
    return "bg-secondary/50 border-border";
  };

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const totalPositivo = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) > 0).length;
  const totalNegativo = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) < 0).length;
  const totalZerado = filtered.filter((s: any) => (s.saldo?.saldoFMO ?? 0) === 0).length;

  return (
    <AppLayout title="Folgas Mensais Obrigatórias (FMO)">
      <div className="space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
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
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
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
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400" style={{ fontFamily: "Montserrat, sans-serif" }}>{totalNegativo}</p>
                <p className="text-xs text-muted-foreground">Saldo negativo</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            O saldo de FMO é calculado <strong>automaticamente</strong> com base nos dias de escala de cada prontidão
            e no histórico de vínculo do bombeiro. A cada <strong>2 dias de serviço</strong>, o bombeiro tem direito a 1 FMO.
            Apenas bombeiros das prontidões <strong>Verde, Azul e Amarela</strong> são elegíveis.
            Para registrar mudança de prontidão, use o botão <strong>"Aplicar Código a Período"</strong> na tela de Bombeiros.
          </p>
        </div>

        {/* Saldos table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                {search || filterEquipe !== "todas"
                  ? "Nenhum bombeiro encontrado com os filtros aplicados."
                  : "Nenhum bombeiro elegível para FMO. Cadastre bombeiros nas prontidões Verde, Azul ou Amarela e configure as escalas de serviço."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bombeiro</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prontidão</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias de Serviço</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">FMO Geradas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">FMO Usadas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo FMO</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any) => {
                    const saldo = item.saldo?.saldoFMO ?? 0;
                    const diasServico = item.saldo?.totalDiasServico ?? 0;
                    const fmoGeradas = item.saldo?.totalFMOGeradas ?? 0;
                    const fmoUsadas = item.saldo?.fmoUsadas ?? 0;
                    return (
                      <tr key={item.bombeiro.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">{item.bombeiro.nome.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.bombeiro.nome}</p>
                              <p className="text-xs text-muted-foreground">{item.bombeiro.posto}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TeamBadge equipe={item.bombeiro.equipe as Equipe} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{diasServico}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{fmoGeradas}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{fmoUsadas}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center w-10 h-7 rounded-md text-sm font-bold border",
                            getSaldoBg(saldo),
                            getSaldoColor(saldo)
                          )}>
                            {saldo > 0 ? `+${saldo}` : saldo}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
