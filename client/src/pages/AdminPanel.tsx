import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Shield, Building2, Users, Crown, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { loading, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && user?.role !== "admin") navigate("/");
  }, [loading, isAuthenticated, user]);

  const utils = trpc.useUtils();
  const { data: quarteis, isLoading: loadingQuarteis } = trpc.quartel.listAll.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const { data: usuarios, isLoading: loadingUsuarios } = trpc.admin.listUsers.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  const [showAddQuartel, setShowAddQuartel] = useState(false);
  const [deleteQuartelId, setDeleteQuartelId] = useState<number | null>(null);
  const [promoverUserId, setPromoverUserId] = useState<number | null>(null);
  const [rebaixarUserId, setRebaixarUserId] = useState<number | null>(null);
  const [formQuartel, setFormQuartel] = useState({ nome: "", sigla: "", cidade: "", estado: "" });

  const createQuartel = trpc.quartel.create.useMutation({
    onSuccess: () => {
      utils.quartel.listAll.invalidate();
      utils.quartel.myQuarteis.invalidate();
      setShowAddQuartel(false);
      setFormQuartel({ nome: "", sigla: "", cidade: "", estado: "" });
      toast.success("Quartel criado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteQuartel = trpc.quartel.delete.useMutation({
    onSuccess: () => {
      utils.quartel.listAll.invalidate();
      utils.quartel.myQuarteis.invalidate();
      setDeleteQuartelId(null);
      toast.success("Quartel removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const promoverAdmin = trpc.admin.promoverAdmin.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      setPromoverUserId(null);
      toast.success("Usuário promovido a administrador!");
    },
    onError: (e) => toast.error(e.message),
  });

  const rebaixarAdmin = trpc.admin.rebaixarAdmin.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      setRebaixarUserId(null);
      toast.success("Usuário rebaixado para operador.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateQuartel = () => {
    if (!formQuartel.nome || !formQuartel.sigla) { toast.error("Nome e sigla são obrigatórios."); return; }
    createQuartel.mutate({ nome: formQuartel.nome, sigla: formQuartel.sigla, cidade: formQuartel.cidade || undefined, estado: formQuartel.estado || undefined });
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (user.role !== "admin") {
    return (
      <AppLayout title="Painel Administrativo">
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Acesso restrito a administradores da plataforma.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Painel Administrativo">
      <div className="space-y-5">
        {/* Admin badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-4 h-4 text-amber-400" />
          <p className="text-xs text-amber-400 font-medium">
            Você está no painel de administração da plataforma. Aqui você gerencia todos os quarteis e usuários.
          </p>
        </div>

        <Tabs defaultValue="quarteis">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="quarteis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-4 h-4 mr-2" />
              Quarteis
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Quarteis ── */}
          <TabsContent value="quarteis" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{quarteis?.length || 0} quartel(is) cadastrado(s)</p>
              <Button onClick={() => setShowAddQuartel(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Quartel
              </Button>
            </div>

            {loadingQuarteis ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !quarteis || quarteis.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Nenhum quartel cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quarteis.map((q: any) => (
                  <Card key={q.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>{q.nome}</p>
                            <p className="text-xs text-amber-400/80 font-medium">{q.sigla}</p>
                            {(q.cidade || q.estado) && (
                              <p className="text-xs text-muted-foreground">{[q.cidade, q.estado].filter(Boolean).join(", ")}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteQuartelId(q.id)}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 -mt-1 -mr-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Aba Usuários ── */}
          <TabsContent value="usuarios" className="mt-4">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">{usuarios?.length || 0} usuário(s) registrado(s)</p>
            </div>

            {loadingUsuarios ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !usuarios || usuarios.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Nenhum usuário registrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {usuarios.map((u: any) => (
                  <Card key={u.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-foreground">
                              {(u.name || u.email || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{u.name || "Sem nome"}</p>
                              {u.role === "admin" && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                                  <Crown className="w-2.5 h-2.5 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email || u.openId}</p>
                            <p className="text-xs text-muted-foreground/60">
                              Último acesso: {new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {u.role !== "admin" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPromoverUserId(u.id)}
                              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs"
                              disabled={u.id === user.id}
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              Promover
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRebaixarUserId(u.id)}
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 text-xs"
                              disabled={u.id === user.id}
                            >
                              <UserX className="w-3.5 h-3.5 mr-1" />
                              Rebaixar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add quartel dialog */}
      <Dialog open={showAddQuartel} onOpenChange={setShowAddQuartel}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Novo Quartel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do Quartel *</Label>
              <Input value={formQuartel.nome} onChange={e => setFormQuartel(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: 1º Subgrupamento de Bombeiros" className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sigla *</Label>
              <Input value={formQuartel.sigla} onChange={e => setFormQuartel(f => ({ ...f, sigla: e.target.value }))} placeholder="Ex: 1º SGB" className="bg-background border-border" maxLength={20} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cidade</Label>
                <Input value={formQuartel.cidade} onChange={e => setFormQuartel(f => ({ ...f, cidade: e.target.value }))} placeholder="Ex: Andradina" className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Estado</Label>
                <Input value={formQuartel.estado} onChange={e => setFormQuartel(f => ({ ...f, estado: e.target.value }))} placeholder="Ex: SP" className="bg-background border-border" maxLength={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuartel(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleCreateQuartel} disabled={createQuartel.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createQuartel.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Quartel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete quartel dialog */}
      <AlertDialog open={!!deleteQuartelId} onOpenChange={() => setDeleteQuartelId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Quartel</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover este quartel? Todos os dados associados (bombeiros, escalas, prontidões e afastamentos) serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuartelId && deleteQuartel.mutate({ id: deleteQuartelId })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteQuartel.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promover admin dialog */}
      <AlertDialog open={!!promoverUserId} onOpenChange={() => setPromoverUserId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Promover a Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Este usuário terá acesso total à plataforma, incluindo todos os quarteis e o painel administrativo. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promoverUserId && promoverAdmin.mutate({ userId: promoverUserId })}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {promoverAdmin.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Promover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rebaixar admin dialog */}
      <AlertDialog open={!!rebaixarUserId} onOpenChange={() => setRebaixarUserId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Rebaixar Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Este usuário perderá os privilégios de administrador e não terá mais acesso ao painel administrativo. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rebaixarUserId && rebaixarAdmin.mutate({ userId: rebaixarUserId })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rebaixarAdmin.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Rebaixar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
