import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Search, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FolhasObrigatorias() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState("todas");
  const [showAddProntidao, setShowAddProntidao] = useState(false);
  const [formProntidao, setFormProntidao] = useState({ bombeiroId: "", data: "", equipe: "VD" });

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const utils = trpc.useUtils();
  const { data: bombeiros } = trpc.bombeiro.list.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });
  const { data: saldos, isLoading } = trpc.fo.saldoQuartel.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });

  const createProntidao = trpc.prontidao.create.useMutation({
    onSuccess: () => {
      utils.fo.saldoQuartel.invalidate();
      setShowAddProntidao(false);
      setFormProntidao({ bombeiroId: "", data: "", equipe: "VD" });
      toast.success("Prontidão registrada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (saldos || []).filter((item: any) => {
    const nome = item.bombeiro?.nome?.toLowerCase() || "";
    const matchSearch = nome.includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "todas" || item.bombeiro?.equipe === filterEquipe;
    return matchSearch && matchEquipe;
  });

  const handleSubmitProntidao = () => {
    if (!formProntidao.bombeiroId || !formProntidao.data) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    // Get equipe from selected bombeiro
    const selectedBombeiro = (bombeiros || []).find(b => b.id === parseInt(formProntidao.bombeiroId));
    createProntidao.mutate({
      quartelId: quartelId!,
      bombeiroId: parseInt(formProntidao.bombeiroId),
      data: formProntidao.data,
      equipe: (selectedBombeiro?.equipe || formProntidao.equipe) as any,
    });
  };

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

  const totalPositivo = (saldos || []).filter((s: any) => s.saldo?.saldoFO > 0).length;
  const totalNegativo = (saldos || []).filter((s: any) => s.saldo?.saldoFO < 0).length;
  const totalZerado = (saldos || []).filter((s: any) => s.saldo?.saldoFO === 0).length;

  return (
    <AppLayout title="Folgas Obrigatórias (FO)">
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

        {/* Filters and actions */}
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
              <SelectTrigger className="w-32 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="VD">VD</SelectItem>
                <SelectItem value="VA">VA</SelectItem>
                <SelectItem value="VB">VB</SelectItem>
                <SelectItem value="VC">VC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowAddProntidao(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Prontidão
          </Button>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            O saldo de FO é calculado automaticamente com base nas prontidões realizadas e afastamentos registrados.
            Cada prontidão gera direito a 1 FO. Afastamentos não geram FO.
          </p>
        </div>

        {/* Saldos table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Nenhum bombeiro encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bombeiro</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prontidões</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">FO Tiradas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo FO</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any) => {
                    const saldo = item.saldo?.saldoFO ?? 0;
                    const prontidoes = item.saldo?.totalProntidoes ?? 0;
                    const foTiradas = item.saldo?.totalFOTiradas ?? 0;
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
                          <TeamBadge equipe={item.bombeiro.equipe} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{prontidoes}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{foTiradas}</span>
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

      {/* Add prontidão dialog */}
      <Dialog open={showAddProntidao} onOpenChange={setShowAddProntidao}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Registrar Prontidão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bombeiro *</Label>
              <Select value={formProntidao.bombeiroId} onValueChange={v => setFormProntidao(f => ({ ...f, bombeiroId: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o bombeiro" />
                </SelectTrigger>
                <SelectContent>
                  {(bombeiros || []).map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.posto} {b.nome} — {b.equipe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data da Prontidão *</Label>
              <Input type="date" value={formProntidao.data} onChange={e => setFormProntidao(f => ({ ...f, data: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Equipe (se diferente)</Label>
              <Select value={formProntidao.equipe} onValueChange={v => setFormProntidao(f => ({ ...f, equipe: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VD">VD</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="VB">VB</SelectItem>
                  <SelectItem value="VC">VC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProntidao(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleSubmitProntidao} disabled={createProntidao.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createProntidao.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
