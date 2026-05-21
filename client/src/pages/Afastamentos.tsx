import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Search, ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Siglas de afastamentos conforme sistema anterior
export const SIGLAS_AFASTAMENTO = [
  { sigla: "F",   label: "Férias",                    cor: "bg-orange-600 text-white" },
  { sigla: "LP",  label: "Licença Prêmio",             cor: "bg-pink-600 text-white" },
  { sigla: "LT",  label: "Luto",                       cor: "bg-gray-700 text-white" },
  { sigla: "DS",  label: "Dispensa do Serviço",        cor: "bg-red-600 text-white" },
  { sigla: "FMO", label: "Folga Mensal Obrigatória",   cor: "bg-purple-600 text-white" },
  { sigla: "PA",  label: "Pausa Autorizada",           cor: "bg-slate-600 text-white" },
  { sigla: "D",   label: "Doação de Sangue",           cor: "bg-rose-600 text-white" },
  { sigla: "C",   label: "Convalescença",              cor: "bg-amber-600 text-white" },
  { sigla: "LTS", label: "Licença Tratamento Saúde",   cor: "bg-indigo-600 text-white" },
  { sigla: "CFS", label: "Curso Form. Sargentos",      cor: "bg-violet-600 text-white" },
  { sigla: "CAS", label: "Curso Aperfeiçoamento",      cor: "bg-fuchsia-600 text-white" },
  { sigla: "EAP", label: "Estágio Atualização",        cor: "bg-lime-600 text-white" },
  { sigla: "TAF", label: "Teste Aptidão Física",       cor: "bg-emerald-600 text-white" },
  { sigla: "ME",  label: "Meio Expediente",            cor: "bg-sky-600 text-white" },
  { sigla: "AG",  label: "Aglutinada",                 cor: "bg-teal-600 text-white" },
  { sigla: "FER", label: "Feriado",                     cor: "bg-cyan-600 text-white" },
  { sigla: "PF",  label: "Ponto Facultativo",           cor: "bg-blue-500 text-white" },
] as const; // EX removido — expediente é tipo de escala, não afastamento

type TipoAfastamento = typeof SIGLAS_AFASTAMENTO[number]["sigla"];

function getSiglaConfig(sigla: string) {
  return SIGLAS_AFASTAMENTO.find(s => s.sigla === sigla) ?? { sigla, label: sigla, cor: "bg-slate-700 text-white" };
}

// Formata data sem conversão de timezone (evita o bug de 1 dia a menos)
function formatDate(val: string | Date): string {
  if (!val) return "";
  // Se for string no formato YYYY-MM-DD, parsear sem timezone
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y, m, d] = val.split("T")[0].split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  const date = typeof val === "string" ? new Date(val) : val;
  return date.toLocaleDateString("pt-BR");
}

function isAtivo(dataFim: string | Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (typeof dataFim === "string" && /^\d{4}-\d{2}-\d{2}/.test(dataFim)) {
    const [y, m, d] = dataFim.split("T")[0].split("-").map(Number);
    const fim = new Date(y, m - 1, d);
    return fim >= today;
  }
  return new Date(dataFim) >= today;
}

export default function Afastamentos() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    bombeiroId: "",
    tipo: "",
    dataInicio: "",
    dataFim: "",
    observacao: "",
    periodoConcessao: "",
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const utils = trpc.useUtils();
  const { data: bombeiros } = trpc.bombeiro.list.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });
  const { data: afastamentos, isLoading } = trpc.afastamento.listByQuartel.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });

  // Buscar períodos de concessão do bombeiro selecionado (para FMO)
  const { data: saldoBombeiro } = trpc.fo.saldoBombeiro.useQuery(
    { bombeiroId: parseInt(form.bombeiroId), quartelId: quartelId! },
    { enabled: !!form.bombeiroId && !!quartelId && form.tipo === "FMO" }
  );

  const createMutation = trpc.afastamento.create.useMutation({
    onSuccess: () => {
      utils.afastamento.listByQuartel.invalidate();
      utils.afastamento.listAtivos.invalidate();
      setShowAdd(false);
      setForm({ bombeiroId: "", tipo: "", dataInicio: "", dataFim: "", observacao: "", periodoConcessao: "" });
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
    if (form.tipo === "FMO" && !form.periodoConcessao) {
      toast.error("Para FMO, informe o período de concessão.");
      return;
    }
    createMutation.mutate({
      quartelId: quartelId!,
      bombeiroId: parseInt(form.bombeiroId),
      tipo: form.tipo as TipoAfastamento,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      descricao: form.observacao || undefined,
      periodoConcessao: form.periodoConcessao || undefined,
    });
  };

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const periodosDisponiveis = saldoBombeiro?.periodosConcessao ?? [];

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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Concessão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any) => {
                    const ativo = isAtivo(item.afastamento.dataFim);
                    const config = getSiglaConfig(item.afastamento.tipo);
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
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-9 h-7 rounded text-[11px] font-black ${config.cor}`}>
                              {config.sigla}
                            </span>
                            <span className="text-xs text-muted-foreground">{config.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">
                            {formatDate(item.afastamento.dataInicio)} — {formatDate(item.afastamento.dataFim)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.afastamento.periodoConcessao ? (
                            <span className="text-xs text-purple-400 font-medium">{item.afastamento.periodoConcessao}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

        {/* Legenda de siglas */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Legenda de Siglas</p>
            <div className="flex flex-wrap gap-2">
              {SIGLAS_AFASTAMENTO.map(s => (
                <div key={s.sigla} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-9 h-6 rounded text-[10px] font-black ${s.cor}`}>
                    {s.sigla}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Registrar Afastamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bombeiro *</Label>
              <Select
                value={form.bombeiroId}
                onValueChange={v => setForm(f => ({ ...f, bombeiroId: v, periodoConcessao: "" }))}
              >
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
              <Select
                value={form.tipo}
                onValueChange={v => setForm(f => ({ ...f, tipo: v, periodoConcessao: "" }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {SIGLAS_AFASTAMENTO.map(s => (
                    <SelectItem key={s.sigla} value={s.sigla}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-9 h-6 rounded text-[10px] font-black ${s.cor}`}>
                          {s.sigla}
                        </span>
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período de concessão — só para FMO */}
            {form.tipo === "FMO" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Período de Concessão *</Label>
                {!form.bombeiroId ? (
                  <p className="text-xs text-muted-foreground italic">Selecione o bombeiro para ver os períodos disponíveis.</p>
                ) : periodosDisponiveis.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">Nenhum período de FMO disponível para este bombeiro.</p>
                ) : (
                  <Select
                    value={form.periodoConcessao}
                    onValueChange={v => setForm(f => ({ ...f, periodoConcessao: v }))}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecione o período de concessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodosDisponiveis.map((p: any) => (
                        <SelectItem key={p.numero} value={p.label}>
                          <span className="text-sm">{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Início *</Label>
                <Input
                  type="date"
                  value={form.dataInicio}
                  onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Data Fim *</Label>
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Observação</Label>
              <Input
                placeholder="Opcional"
                value={form.observacao}
                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary text-primary-foreground">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover afastamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId, quartelId: quartelId! })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
