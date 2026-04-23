import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Relatorios() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId, quartelNome } = useQuartel();
  const [, navigate] = useLocation();

  const hoje = new Date();
  const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()}`;

  const [filtros, setFiltros] = useState({
    dataInicio: primeiroDiaMes,
    dataFim: ultimoDiaMes,
    equipe: "todas",
  });
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const { data: relatorio, isLoading, refetch } = trpc.fo.relatorio.useQuery(
    {
      quartelId: quartelId!,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      equipe: filtros.equipe !== "todas" ? filtros.equipe as any : undefined,
    },
    { enabled: !!quartelId && aplicado }
  );

  const handleGerar = () => {
    setAplicado(true);
    refetch();
  };

  const getSaldoColor = (saldo: number) => {
    if (saldo > 0) return "text-emerald-400";
    if (saldo < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const stats = useMemo(() => {
    if (!relatorio) return null;
    const total = relatorio.length;
    const positivos = relatorio.filter((r: any) => (r.saldo?.saldoFMO ?? 0) > 0).length;
    const negativos = relatorio.filter((r: any) => (r.saldo?.saldoFMO ?? 0) < 0).length;
    const totalProntidoes = relatorio.reduce((acc: number, r: any) => acc + (r.saldo?.totalProntidoes ?? 0), 0);
    return { total, positivos, negativos, totalProntidoes };
  }, [relatorio]);

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <AppLayout title="Relatórios de FMO">
      <div className="space-y-5">
        {/* Filter card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Filtros do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início</Label>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim</Label>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Equipe</Label>
                <Select value={filtros.equipe} onValueChange={v => setFiltros(f => ({ ...f, equipe: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as equipes</SelectItem>
                    <SelectItem value="Prontidão Verde">Prontidão Verde</SelectItem>
                    <SelectItem value="Prontidão Azul">Prontidão Azul</SelectItem>
                    <SelectItem value="Prontidão Amarela">Prontidão Amarela</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleGerar} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bombeiros</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>{stats.totalProntidoes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prontidões</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-emerald-400" style={{ fontFamily: "Montserrat, sans-serif" }}>{stats.positivos}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo positivo</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-red-400" style={{ fontFamily: "Montserrat, sans-serif" }}>{stats.negativos}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo negativo</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results */}
        {!aplicado ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Configure os filtros e clique em "Gerar Relatório"</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !relatorio || relatorio.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Relatório de FMO — {quartelNome}
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  {new Date(filtros.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a {new Date(filtros.dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
                  {filtros.equipe !== "todas" && ` · Equipe ${filtros.equipe}`}
                </span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bombeiro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prontidões</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">FMO Usadas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo FMO</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.map((item: any) => {
                    const saldo = item.saldo?.saldoFMO ?? 0;
                    return (
                      <tr key={item.bombeiro.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{item.bombeiro.nome}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-muted-foreground">{item.bombeiro.posto}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TeamBadge equipe={item.bombeiro.equipe} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{item.saldo?.totalProntidoes ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{item.saldo?.fmoUsadas ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-sm font-bold", getSaldoColor(saldo))}>
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
