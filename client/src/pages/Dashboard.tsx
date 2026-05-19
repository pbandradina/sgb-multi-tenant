import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge } from "@/components/TeamBadge";
import { Loader2, Users, AlertTriangle, TrendingUp, Clock, UserX, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  // Trocas do mês atual
  const [hojeQuery] = useState(() => new Date());
  const { data: trocasHoje, refetch: refetchTrocas } = trpc.troca.list.useQuery(
    { quartelId: quartelId!, ano: hojeQuery.getFullYear(), mes: hojeQuery.getMonth() },
    { enabled: !!quartelId }
  );

  // Estado do modal de edição de troca
  const [editTroca, setEditTroca] = useState<null | {
    id: number; quartelId: number;
    bombeiroEntraId: number; bombeireSaiId: number;
    dataTroca: string; dataPagamento: string;
    numeroSEI: string; numeroParte: string;
  }>(null);

  const updateTroca = trpc.troca.update.useMutation({
    onSuccess: () => { toast.success("Troca atualizada!"); setEditTroca(null); refetchTrocas(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteTroca = trpc.troca.delete.useMutation({
    onSuccess: () => { toast.success("Troca removida!"); refetchTrocas(); },
    onError: (e) => toast.error(e.message),
  });

  function handleDeleteTroca(id: number, quartelId: number, descricao: string) {
    if (!confirm(`Remover a troca "${descricao}"? Esta ação não pode ser desfeita.`)) return;
    deleteTroca.mutate({ id, quartelId });
  }

  function handleEditTroca(t: NonNullable<typeof trocasHoje>[number]) {
    const fmt = (d: any) => d ? String(d).split('T')[0] : '';
    setEditTroca({
      id: t.id,
      quartelId: t.quartelId,
      bombeiroEntraId: t.bombeiroEntraId,
      bombeireSaiId: t.bombeireSaiId,
      dataTroca: fmt(t.dataTroca),
      dataPagamento: fmt(t.dataPagamento),
      numeroSEI: t.numeroSEI || '',
      numeroParte: t.numeroParte || '',
    });
  }

  function handleSaveEditTroca() {
    if (!editTroca) return;
    updateTroca.mutate({
      id: editTroca.id,
      quartelId: editTroca.quartelId,
      bombeiroEntraId: editTroca.bombeiroEntraId,
      bombeireSaiId: editTroca.bombeireSaiId,
      dataTroca: editTroca.dataTroca,
      dataPagamento: editTroca.dataPagamento || null,
      numeroSEI: editTroca.numeroSEI || null,
      numeroParte: editTroca.numeroParte || null,
    });
  }

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

  // IDs dos bombeiros que entram por troca hoje (de outra equipe)
  const trocasDeHoje = (trocasHoje || []).filter(t => {
    const d = t.dataTroca ? new Date(t.dataTroca) : null;
    if (!d) return false;
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return ds === hojeStr;
  });
  // IDs que saem por troca hoje (não contam como presentes)
  const trocaSaiHojeIds = new Set(trocasDeHoje.map(t => t.bombeireSaiId));
  // Bombeiros de outra equipe que entram por troca hoje
  const trocaEntraHoje = trocasDeHoje
    .map(t => {
      const bom = (bombeiros || []).find(b => b.id === t.bombeiroEntraId);
      return bom ? { ...bom, isTroca: true } : null;
    })
    .filter(Boolean) as (typeof bombeiros extends (infer T)[] | undefined ? T & { isTroca: boolean } : never)[];

  // Lista final de presentes: equipe do dia (exceto afastados e quem saiu por troca) + quem entrou por troca
  const POSTO_ORDER: Record<string, number> = {
    '1º Sgt PM': 1, '1º Sargento': 1,
    '2º Sgt PM': 2, '2º Sargento': 2,
    '3º Sgt PM': 3, '3º Sargento': 3,
    'Cb PM': 4, 'Cabo': 4,
    'Sd PM': 5, 'Soldado': 5,
  };
  const sortBombeiros = (a: { posto?: string | null; nomeGuerra?: string | null; nome: string }, b: { posto?: string | null; nomeGuerra?: string | null; nome: string }) => {
    const pa = POSTO_ORDER[a.posto || ''] ?? 99;
    const pb = POSTO_ORDER[b.posto || ''] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.nomeGuerra || a.nome).localeCompare(b.nomeGuerra || b.nome);
  };
  const presentesBase = bombeirosDaEquipeHoje
    .filter(b => !afastadosHojeIds.has(b.id) && !trocaSaiHojeIds.has(b.id))
    .map(b => ({ ...b, isTroca: false }));
  const presentesHoje = [...presentesBase, ...trocaEntraHoje].sort(sortBombeiros);
  const efetivoPresenteHoje = presentesHoje.length;

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
              <div className="flex items-center gap-1.5 mt-1 mb-3">
                <TeamBadge equipe={prontidaoHoje as any} size="sm" short />
                <p className="text-xs text-muted-foreground">de {bombeirosDaEquipeHoje.length} na {prontidaoHoje.replace('Prontidão ', '')}</p>
              </div>
              {loadingBombeiros || loadingAfastamentos ? null : (
                <div className="space-y-1 max-h-48 overflow-y-auto border-t border-border/40 pt-2">
                  {presentesHoje.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum bombeiro presente</p>
                  ) : presentesHoje.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-xs text-foreground truncate">
                        <span className="text-muted-foreground mr-1">{b.posto}</span>
                        {b.nomeGuerra || b.nome}
                      </span>
                      {b.isTroca && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold shrink-0">
                          <ArrowLeftRight className="w-3 h-3" />(troca)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

        {/* Trocas do Mês */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
              <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              Trocas de Serviço — {hojeQuery.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!trocasHoje || trocasHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma troca registrada neste mês.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Data</th>
                      <th className="text-left py-2 pr-3 text-emerald-400 font-semibold">Entra</th>
                      <th className="text-left py-2 pr-3 text-red-400 font-semibold">Sai</th>
                      <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Pagamento</th>
                      <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">SEI</th>
                      <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Parte</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trocasHoje.map(t => {
                      const fmt = (d: any) => d ? new Date(String(d).split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                      const nomeEntra = t.bombeiroEntra?.nomeGuerra || t.bombeiroEntra?.nome || '?';
                      const nomeSai = t.bombeireSai?.nomeGuerra || t.bombeireSai?.nome || '?';
                      const postoEntra = t.bombeiroEntra?.posto || '';
                      const postoSai = t.bombeireSai?.posto || '';
                      return (
                        <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                          <td className="py-2 pr-3 font-medium text-foreground">{fmt(t.dataTroca)}</td>
                          <td className="py-2 pr-3">
                            <span className="text-emerald-400 font-semibold">{postoEntra} {nomeEntra}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className="text-red-400 font-semibold">{postoSai} {nomeSai}</span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{fmt(t.dataPagamento)}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{t.numeroSEI || '-'}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{t.numeroParte || '-'}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditTroca(t)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar troca"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTroca(t.id, t.quartelId, `${nomeEntra} ↔ ${nomeSai} em ${fmt(t.dataTroca)}`)}
                                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                                title="Excluir troca"
                                disabled={deleteTroca.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de edição de troca */}
        <Dialog open={!!editTroca} onOpenChange={(open) => { if (!open) setEditTroca(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                Editar Troca de Serviço
              </DialogTitle>
            </DialogHeader>
            {editTroca && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Entra (assume o serviço)</Label>
                    <Select
                      value={String(editTroca.bombeiroEntraId)}
                      onValueChange={v => setEditTroca(prev => prev ? { ...prev, bombeiroEntraId: Number(v) } : null)}
                    >
                      <SelectTrigger className="h-9 text-xs border-emerald-500/50 focus:ring-emerald-500/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(bombeiros || []).map(b => (
                          <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                            {b.posto} {b.nomeGuerra || b.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Sai (cede o serviço)</Label>
                    <Select
                      value={String(editTroca.bombeireSaiId)}
                      onValueChange={v => setEditTroca(prev => prev ? { ...prev, bombeireSaiId: Number(v) } : null)}
                    >
                      <SelectTrigger className="h-9 text-xs border-red-500/50 focus:ring-red-500/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(bombeiros || []).map(b => (
                          <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                            {b.posto} {b.nomeGuerra || b.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Data da Troca</Label>
                    <Input type="date" className="h-9 text-xs" value={editTroca.dataTroca}
                      onChange={e => setEditTroca(prev => prev ? { ...prev, dataTroca: e.target.value } : null)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Data de Pagamento</Label>
                    <Input type="date" className="h-9 text-xs" value={editTroca.dataPagamento}
                      onChange={e => setEditTroca(prev => prev ? { ...prev, dataPagamento: e.target.value } : null)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nº SEI</Label>
                    <Input className="h-9 text-xs" placeholder="Ex: 057000..." value={editTroca.numeroSEI}
                      onChange={e => setEditTroca(prev => prev ? { ...prev, numeroSEI: e.target.value } : null)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Parte Nº</Label>
                    <Input className="h-9 text-xs" placeholder="Ex: 93" value={editTroca.numeroParte}
                      onChange={e => setEditTroca(prev => prev ? { ...prev, numeroParte: e.target.value } : null)} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditTroca(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveEditTroca} disabled={updateTroca.isPending}>
                {updateTroca.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
