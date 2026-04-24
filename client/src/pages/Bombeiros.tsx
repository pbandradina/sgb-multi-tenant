import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge, EQUIPES, type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Search, Users, UserCheck, CalendarRange, History, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { toast } from "sonner";

const POSTOS = [
  "Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento",
  "Subtenente"
];

function formatDateLocal(val: string | Date): string {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y, m, d] = val.split("T")[0].split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  const date = typeof val === "string" ? new Date(val) : val;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

type BombeiroForm = {
  nome: string;
  nomeGuerra: string;
  posto: string;
  equipe: string;
  dataInicio: string;
};

const EMPTY_FORM: BombeiroForm = { nome: "", nomeGuerra: "", posto: "", equipe: "", dataInicio: "" };

export default function Bombeiros() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState<string>("all");

  // Add / Edit dialog
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BombeiroForm>(EMPTY_FORM);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Aplicar Código a Período
  const [showAplicarCodigo, setShowAplicarCodigo] = useState(false);
  const [selectedBombeiro, setSelectedBombeiro] = useState<{ id: number; nome: string; nomeGuerra?: string | null; equipe: string } | null>(null);
  const [codigoForm, setCodigoForm] = useState({ equipe: "Prontidão Azul" as Equipe, dataInicio: "", dataFim: "", observacao: "" });

  // Histórico expandido
  const [expandedHistorico, setExpandedHistorico] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const utils = trpc.useUtils();
  const { data: bombeiros, isLoading } = trpc.bombeiro.list.useQuery(
    { quartelId: quartelId! }, { enabled: !!quartelId }
  );

  const { data: historicoBombeiro, isLoading: loadingHistorico } = trpc.historico.listByBombeiro.useQuery(
    { bombeiroId: expandedHistorico!, quartelId: quartelId! },
    { enabled: !!expandedHistorico && !!quartelId }
  );

  const createMutation = trpc.bombeiro.create.useMutation({
    onSuccess: () => {
      utils.bombeiro.list.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("Bombeiro cadastrado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.bombeiro.update.useMutation({
    onSuccess: () => {
      utils.bombeiro.list.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success("Bombeiro atualizado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.bombeiro.delete.useMutation({
    onSuccess: () => {
      utils.bombeiro.list.invalidate();
      setDeleteId(null);
      toast.success("Bombeiro removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const aplicarCodigoMutation = trpc.historico.create.useMutation({
    onSuccess: () => {
      utils.bombeiro.list.invalidate();
      utils.historico.listByBombeiro.invalidate();
      setShowAplicarCodigo(false);
      setSelectedBombeiro(null);
      setCodigoForm({ equipe: "Prontidão Azul", dataInicio: "", dataFim: "", observacao: "" });
      toast.success("Código aplicado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteHistoricoMutation = trpc.historico.delete.useMutation({
    onSuccess: () => {
      utils.historico.listByBombeiro.invalidate();
      toast.success("Registro removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (bombeiros || []).filter(b => {
    const matchSearch =
      b.nome.toLowerCase().includes(search.toLowerCase()) ||
      (b.nomeGuerra ?? "").toLowerCase().includes(search.toLowerCase()) ||
      b.posto.toLowerCase().includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "all" || b.equipe === filterEquipe;
    return matchSearch && matchEquipe;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (b: typeof filtered[0]) => {
    setEditingId(b.id);
    setForm({
      nome: b.nome,
      nomeGuerra: b.nomeGuerra ?? "",
      posto: b.posto,
      equipe: b.equipe,
      dataInicio: typeof b.dataInicio === "string" ? b.dataInicio.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.nome || !form.posto || !form.equipe || !form.dataInicio) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        quartelId: quartelId!,
        nome: form.nome,
        nomeGuerra: form.nomeGuerra || null,
        posto: form.posto,
        equipe: form.equipe as Equipe,
        dataInicio: form.dataInicio,
      });
    } else {
      createMutation.mutate({
        quartelId: quartelId!,
        nome: form.nome,
        nomeGuerra: form.nomeGuerra || undefined,
        posto: form.posto,
        equipe: form.equipe as Equipe,
        dataInicio: form.dataInicio,
      });
    }
  };

  const handleAplicarCodigo = () => {
    if (!selectedBombeiro || !codigoForm.equipe || !codigoForm.dataInicio) {
      toast.error("Preencha a prontidão e a data de início.");
      return;
    }
    aplicarCodigoMutation.mutate({
      quartelId: quartelId!,
      bombeiroId: selectedBombeiro.id,
      equipe: codigoForm.equipe,
      dataInicio: codigoForm.dataInicio,
      dataFim: codigoForm.dataFim || undefined,
      observacao: codigoForm.observacao || undefined,
    });
  };

  const openAplicarCodigo = (b: typeof filtered[0]) => {
    setSelectedBombeiro({ id: b.id, nome: b.nome, nomeGuerra: b.nomeGuerra, equipe: b.equipe });
    setCodigoForm({ equipe: b.equipe as Equipe, dataInicio: "", dataFim: "", observacao: "" });
    setShowAplicarCodigo(true);
  };

  // Display name: prefer nomeGuerra
  const displayName = (b: { nome: string; nomeGuerra?: string | null }) =>
    b.nomeGuerra?.trim() ? b.nomeGuerra.trim() : b.nome;

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="Bombeiros">
      <div className="space-y-5">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, nome de guerra ou posto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {EQUIPES.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Bombeiro
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{filtered.length} bombeiro{filtered.length !== 1 ? "s" : ""}</span>
          {filterEquipe !== "all" && <TeamBadge equipe={filterEquipe as Equipe} size="sm" />}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                {search || filterEquipe !== "all" ? "Nenhum bombeiro encontrado com os filtros aplicados." : "Nenhum bombeiro cadastrado ainda."}
              </p>
              {!search && filterEquipe === "all" && (
                <Button onClick={openAdd} variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 mr-2" />Adicionar primeiro bombeiro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome de Guerra</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome Completo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posto/Graduação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prontidão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Desde</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <>
                      <tr key={b.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/5"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {displayName(b).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {b.nomeGuerra?.trim() ? b.nomeGuerra.trim() : <span className="text-muted-foreground italic text-xs">—</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{b.nome}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{b.posto}</td>
                        <td className="px-4 py-3"><TeamBadge equipe={b.equipe as Equipe} size="sm" /></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDateLocal(b.dataInicio)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(b)}
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAplicarCodigo(b)}
                              className="text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10"
                              title="Aplicar Código a Período"
                            >
                              <CalendarRange className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedHistorico(expandedHistorico === b.id ? null : b.id)}
                              className="text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
                              title="Ver Histórico"
                            >
                              <History className="w-4 h-4" />
                              {expandedHistorico === b.id ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(b.id)}
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Histórico expandido */}
                      {expandedHistorico === b.id && (
                        <tr key={`hist-${b.id}`} className="bg-secondary/10">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5" /> Histórico de Vínculos de Prontidão
                              </p>
                              {loadingHistorico ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : !historicoBombeiro || historicoBombeiro.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Nenhum vínculo registrado.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {historicoBombeiro.map((h: any) => (
                                    <div key={h.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border/50">
                                      <div className="flex items-center gap-3">
                                        <TeamBadge equipe={h.equipe as Equipe} size="sm" />
                                        <span className="text-xs text-muted-foreground">
                                          {formatDateLocal(h.dataInicio)} →{" "}
                                          {h.dataFim ? formatDateLocal(h.dataFim) : <span className="text-emerald-400 font-medium">Vigente</span>}
                                        </span>
                                        {h.observacao && <span className="text-xs text-muted-foreground italic">· {h.observacao}</span>}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteHistoricoMutation.mutate({ id: h.id, quartelId: quartelId! })}
                                        className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 h-7 w-7 p-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Aplicar Código a Período */}
      <Dialog open={showAplicarCodigo} onOpenChange={(open) => { if (!open) { setShowAplicarCodigo(false); setSelectedBombeiro(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Aplicar Código a Período</DialogTitle>
            {selectedBombeiro && (
              <p className="text-sm text-muted-foreground">
                Bombeiro: <span className="font-medium text-foreground">
                  {selectedBombeiro.nomeGuerra?.trim() ? selectedBombeiro.nomeGuerra : selectedBombeiro.nome}
                </span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Prontidão / Código *</Label>
              <Select value={codigoForm.equipe} onValueChange={v => setCodigoForm(f => ({ ...f, equipe: v as Equipe }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início *</Label>
                <Input type="date" value={codigoForm.dataInicio} onChange={e => setCodigoForm(f => ({ ...f, dataInicio: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim (opcional)</Label>
                <Input type="date" value={codigoForm.dataFim} onChange={e => setCodigoForm(f => ({ ...f, dataFim: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Observação (opcional)</Label>
              <Input value={codigoForm.observacao} onChange={e => setCodigoForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: Transferência temporária" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAplicarCodigo(false); setSelectedBombeiro(null); }} className="border-border">Cancelar</Button>
            <Button onClick={handleAplicarCodigo} disabled={aplicarCodigoMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {aplicarCodigoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Aplicar Código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>
              {editingId ? "Editar Bombeiro" : "Adicionar Bombeiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome Completo *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome de Guerra</Label>
                <Input value={form.nomeGuerra} onChange={e => setForm(f => ({ ...f, nomeGuerra: e.target.value }))} placeholder="Ex: Coltri, Silva..." className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Posto/Graduação *</Label>
              <Select value={form.posto} onValueChange={v => setForm(f => ({ ...f, posto: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o posto" />
                </SelectTrigger>
                <SelectContent>
                  {POSTOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Equipe / Prontidão *</Label>
              <Select value={form.equipe} onValueChange={v => setForm(f => ({ ...f, equipe: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data de Início *</Label>
              <Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Primeiro dia de serviço na prontidão atual — base para o cálculo de FMO.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }} className="border-border">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isMutating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isMutating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Bombeiro</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o bombeiro e todos os seus dados (prontidões, afastamentos, FMO). Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId, quartelId: quartelId! })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
