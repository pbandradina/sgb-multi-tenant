import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge } from "@/components/TeamBadge";
import { Loader2, Users, AlertTriangle, TrendingUp, Clock, UserX, ArrowLeftRight, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatGraduacao } from "../../../shared/utils";

const CYCLE_EQUIPES = ['Prontidão Verde', 'Prontidão Amarela', 'Prontidão Azul'] as const;
const CYCLE_REFERENCE = new Date(2026, 0, 1).getTime();

function getProntidaoPorData(data: Date): string {
  const dataMs = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  const diffDays = Math.round((dataMs - CYCLE_REFERENCE) / 86400000);
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

export default function Dashboard() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId, quartelNome } = useQuartel();
  const [, navigate] = useLocation();
  const [dataNavegacao, setDataNavegacao] = useState<Date>(new Date());

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

  const { data: trocasHoje, refetch: refetchTrocas } = trpc.troca.list.useQuery(
    { quartelId: quartelId!, ano: dataNavegacao.getFullYear(), mes: dataNavegacao.getMonth() },
    { enabled: !!quartelId }
  );

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
    if (!confirm(`Remover a troca "${descricao}"?`)) return;
    deleteTroca.mutate({ id, quartelId });
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

  const voltarDia = () => {
    setDataNavegacao(prev => {
      const nd = new Date(prev);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  };

  const avancarDia = () => {
    setDataNavegacao(prev => {
      const nd = new Date(prev);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  };

  const redefinirParaHoje = () => {
    setDataNavegacao(new Date());
  };

  if (loading || !quartelId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalBombeiros = bombeiros?.length || 0;
  const totalAfastados = afastamentosAtivos?.length || 0;
  const prontidaoSelecionada = getProntidaoPorData(dataNavegacao);
  const dataSelecionadaStr = `${dataNavegacao.getFullYear()}-${String(dataNavegacao.getMonth() + 1).padStart(2, '0')}-${String(dataNavegacao.getDate()).padStart(2, '0')}`;

  const afastadosHojeIds = new Set(
    (afastamentosAtivos || [])
      .filter((item: any) => {
        if (!item.dataInicio) return false;
        const inicio = new Date(item.dataInicio.split('T')[0] + 'T00:00:00');
        const fim = item.dataFim ? new Date(item.dataFim.split('T')[0] + 'T23:59:59') : null;
        const alvo = new Date(dataSelecionadaStr + 'T12:00:00');
        return alvo >= inicio && (!fim || alvo <= fim);
      })
      .map((item: any) => item.bombeiroId)
  );

  const bombeirosDaEquipeHoje = (bombeiros || []).filter(b => b.equipe === prontidaoSelecionada);
  const trocasDeHoje = (trocasHoje || []).filter(t => {
    if (!t.dataTroca) return false;
    return String(t.dataTroca).substring(0, 10) === dataSelecionadaStr;
  });

  const trocaSaiHojeIds = new Set(trocasDeHoje.map(t => t.bombeireSaiId));
  const trocaEntraHoje = trocasDeHoje
    .map(t => {
      const bom = (bombeiros || []).find(b => b.id === t.bombeiroEntraId);
      return bom ? { ...bom, isTroca: true } : null;
    })
    .filter(Boolean) as any[];

  const POSTO_ORDER: Record<string, number> = {
    '1º Sgt': 1, '1º Sgt PM': 1, '1º Sargento': 1,
    '2º Sgt': 2, '2º Sgt PM': 2, '2º Sargento': 2,
    '3º Sgt': 3, '3º Sgt PM': 3, '3º Sargento': 3,
    'Cb': 4, 'Cb PM': 4, 'Cabo': 4,
    'Sd': 5, 'Sd PM': 5, 'Soldado': 5,
  };

  const sortBombeiros = (a: any, b: any) => {
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
  const comFONegativo = saldosFO?.filter(s => s.saldo.saldoFMO < 0) || [];
  const comFOAlto = saldosFO?.filter(s => s.saldo.saldoFMO >= 3) || [];

  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const labelDataFormatada = `${String(dataNavegacao.getDate()).padStart(2, '0')} de ${mesesNomes[dataNavegacao.getMonth()]}`;
  const checarHoje = new Date().toDateString() === dataNavegacao.toDateString();

  return (
    <AppLayout title={`Painel de Bordo — ${quartelNome}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Efetivo Total</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{totalBombeiros}</span>
                <span className="text-xs text-muted-foreground">militares ativos</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Efetivo de Serviço</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{efetivoPresenteHoje}</span>
                <span className="text-xs text-muted-foreground">escalados no dia</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Afastados Hoje</span>
                <UserX className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-destructive">{totalAfastados}</span>
                <span className="text-xs text-muted-foreground">licença ou dispensa</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendências de FO</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-amber-600">{comFONegativo.length}</span>
                <span className="text-xs text-muted-foreground">saldos negativos</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-px">
              <Button variant="outline" size="icon" onClick={voltarDia} className="rounded-r-none">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={avancarDia} className="rounded-l-none">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {labelDataFormatada}
              </p>
              <p className="text-xs text-muted-foreground">
                Equipe de Serviço: <span className="font-medium text-foreground">{prontidaoSelecionada}</span>
              </p>
            </div>
          </div>
          {!checarHoje && (
            <Button variant="ghost" size="sm" onClick={redefinirParaHoje} className="text-xs underline">
              Voltar para Hoje
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Escala Prevista
            </CardTitle>
            <TeamBadge equipe={prontidaoSelecionada} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {presentesHoje.length > 0 ? (
                presentesHoje.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        {formatGraduacao(b.posto)} {b.nomeGuerra}
                      </span>
                      <span className="text-xs text-muted-foreground">{b.re}</span>
                    </div>
                    {b.isTroca && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <ArrowLeftRight className="w-3 h-3" /> TROCA
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground col-span-full py-8 text-center italic">
                  Nenhum militar escalado ou presente para esta data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}