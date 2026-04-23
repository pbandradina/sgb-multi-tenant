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
import { Loader2, Plus, Trash2, Search, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";

const POSTOS = [
  "Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento",
  "Subtenente"
];

export default function Bombeiros() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", posto: "", equipe: "", dataInicio: "" });

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const utils = trpc.useUtils();
  const { data: bombeiros, isLoading } = trpc.bombeiro.list.useQuery(
    { quartelId: quartelId! }, { enabled: !!quartelId }
  );

  const createMutation = trpc.bombeiro.create.useMutation({
    onSuccess: () => {
      utils.bombeiro.list.invalidate();
      setShowAdd(false);
      setForm({ nome: "", posto: "", equipe: "", dataInicio: "" });
      toast.success("Bombeiro cadastrado com sucesso!");
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

  const filtered = (bombeiros || []).filter(b => {
    const matchSearch = b.nome.toLowerCase().includes(search.toLowerCase()) ||
      b.posto.toLowerCase().includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "all" || b.equipe === filterEquipe;
    return matchSearch && matchEquipe;
  });

  const handleSubmit = () => {
    if (!form.nome || !form.posto || !form.equipe || !form.dataInicio) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    createMutation.mutate({
      quartelId: quartelId!,
      nome: form.nome,
      posto: form.posto,
      equipe: form.equipe as Equipe,
      dataInicio: form.dataInicio,
    });
  };

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <AppLayout title="Bombeiros">
      <div className="space-y-5">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou posto..."
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
          <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
                <Button onClick={() => setShowAdd(true)} variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posto/Graduação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data de Início</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/5"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{b.nome.charAt(0)}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{b.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{b.posto}</td>
                      <td className="px-4 py-3"><TeamBadge equipe={b.equipe as Equipe} size="sm" /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(b.dataInicio).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(b.id)}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
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
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Adicionar Bombeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome Completo *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do bombeiro" className="bg-background border-border" />
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
                  {EQUIPES.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data de Início *</Label>
              <Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cadastrar
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
