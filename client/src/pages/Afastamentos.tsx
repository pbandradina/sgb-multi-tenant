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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Search, ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TIPOS_AFASTAMENTO = [
  { value: "ferias", label: "Férias" },
  { value: "licenca_medica", label: "Licença Médica" },
  { value: "licenca_especial", label: "Licença Especial" },
  { value: "dispensa_medica", label: "Dispensa Médica" },
  { value: "licenca_maternidade", label: "Licença Maternidade" },
  { value: "licenca_paternidade", label: "Licença Paternidade" },
  { value: "outros", label: "Outros" },
];

function getTipoLabel(tipo: string) {
  return TIPOS_AFASTAMENTO.find(t => t.value === tipo)?.label || tipo.replace(/_/g, " ");
}

function isAtivo(dataFim: string | Date) {
  return new Date(dataFim) >= new Date(new Date().setHours(0, 0, 0, 0));
}

export default function Afastamentos() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ bombeiroId: "", tipo: "", dataInicio: "", dataFim: "", observacao: "" });

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const utils = trpc.useUtils();
  const { data: bombeiros } = trpc.bombeiro.list.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });
  const { data: afastamentos, isLoading } = trpc.afastamento.listByQuartel.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });

  const createMutation = trpc.afastamento.create.useMutation({
    onSuccess: () => {
      utils.afastamento.listByQuartel.invalidate();
      utils.afastamento.listAtivos.invalidate();
      setShowAdd(false);
      setForm({ bombeiroId: "", tipo: "", dataInicio: "", dataFim: "", observacao: "" });
      toast.success("Afastamento registrado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.afastamento.delete.useMutation({
    onSuccess: () => {
      utils.afastamento.listByQuartel.invalidate();
      utils.afastamento.listAtivos.invalidate();
      setDeleteId(null);
      toast.success("Afastamento removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (afastamentos || []).filter((a: any) => {
    const nome = a.bombeiro?.nome?.toLowerCase() || "";
    return nome.includes(search.toLowerCase());
  });

  const handleSubmit = () => {
    if (!form.bombeiroId || !form.tipo || !form.dataInicio || !form.dataFim) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    createMutation.mutate({
      quartelId: quartelId!,
      bombeiroId: parseInt(form.bombeiroId),
      tipo: form.tipo as "ferias" | "licenca_medica" | "dispensa" | "outros",
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      descricao: form.observacao || undefined,
    });
  };

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <AppLayout title="Afastamentos">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Afastamento
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum afastamento encontrado." : "Nenhum afastamento registrado."}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any) => {
                    const ativo = isAtivo(item.afastamento.dataFim);
                    return (
                      <tr key={item.afastamento.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
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
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{getTipoLabel(item.afastamento.tipo)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">
                            {new Date(item.afastamento.dataInicio).toLocaleDateString("pt-BR")} —{" "}
                            {new Date(item.afastamento.dataFim).toLocaleDateString("pt-BR")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {ativo ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                              Encerrado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(item.afastamento.id)}
                            className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Registrar Afastamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bombeiro *</Label>
              <Select value={form.bombeiroId} onValueChange={v => setForm(f => ({ ...f, bombeiroId: v }))}>
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
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Afastamento *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_AFASTAMENTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início *</Label>
                <Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim *</Label>
                <Input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações opcionais" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Afastamento</AlertDialogTitle>
            <AlertDialogDescription>Deseja remover este registro de afastamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId, quartelId: quartelId! })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
