import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, ChangeEvent } from "react";
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
import { SIGLAS_AFASTAMENTO } from "@/pages/Afastamentos";
import { cn } from "@/lib/utils";
import { formatGraduacao } from "../../../shared/utils";

const POSTOS = ["Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento", "Subtenente"];

function formatDateLocal(val: string | Date): string {
  if (!val) return "";
  const date = typeof val === "string" ? new Date(val.split("T")[0] + "T12:00:00") : val;
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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BombeiroForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [showAplicarCodigo, setShowAplicarCodigo] = useState(false);
  const [selectedBombeiro, setSelectedBombeiro] = useState<{ id: number; nome: string; nomeGuerra?: string | null; equipe: string } | null>(null);
  const [codigoForm, setCodigoForm] = useState({ 
    tipo: "prontidao" as "prontidao" | "afastamento",
    equipe: "Prontidão Azul" as Equipe, 
    siglaAfastamento: "",
    dataInicio: "", 
    dataFim: "", 
    observacao: "",
    periodoConcessao: "",
  });

  const [expandedHistorico, setExpandedHistorico] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId, navigate]);

  const utils = trpc.useUtils();
  const { data: bombeiros, isLoading } = trpc.bombeiro.list.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });

  const { data: historicoBombeiro, isLoading: loadingHistorico } = trpc.historico.listByBombeiro.useQuery(
    { bombeiroId: expandedHistorico!, quartelId: quartelId! },
    { enabled: !!expandedHistorico && !!quartelId }
  );

  const createMutation = trpc.bombeiro.create.useMutation({
    onSuccess: () => { utils.bombeiro.list.invalidate(); setShowForm(false); setForm(EMPTY_FORM); toast.success("Sucesso!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.bombeiro.update.useMutation({
    onSuccess: () => { utils.bombeiro.list.invalidate(); setShowForm(false); setEditingId(null); toast.success("Atualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.bombeiro.delete.useMutation({
    onSuccess: () => { utils.bombeiro.list.invalidate(); setDeleteId(null); toast.success("Removido."); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (bombeiros || []).filter((b: any) => {
    const matchSearch = b.nome.toLowerCase().includes(search.toLowerCase()) || (b.nomeGuerra ?? "").toLowerCase().includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "all" || b.equipe === filterEquipe;
    return matchSearch && matchEquipe;
  });

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      nome: b.nome,
      nomeGuerra: b.nomeGuerra ?? "",
      posto: b.posto,
      equipe: b.equipe,
      dataInicio: b.dataInicio ? b.dataInicio.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.nome || !form.posto || !form.equipe || !form.dataInicio) { toast.error("Preencha tudo."); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, quartelId: quartelId!, ...form, equipe: form.equipe as Equipe, nomeGuerra: form.nomeGuerra || null });
    } else {
      createMutation.mutate({ quartelId: quartelId!, ...form, equipe: form.equipe as Equipe, nomeGuerra: form.nomeGuerra || undefined });
    }
  };

  if (loading || !quartelId) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <AppLayout title="Bombeiros">
      <div className="space-y-5">
        <div className="flex gap-3 items-center justify-between">
          <div className="flex gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterEquipe} onValueChange={(v: string) => setFilterEquipe(v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {EQUIPES.map((e: string) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>

        <Card className="border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/30">
                <th className="text-left p-3">Militar</th>
                <th className="text-left p-3">Posto</th>
                <th className="text-left p-3">Prontidão</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{b.nomeGuerra || b.nome}</td>
                  <td className="p-3">{formatGraduacao(b.posto)}</td>
                  <td className="p-3"><TeamBadge equipe={b.equipe} size="sm" /></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(b.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Dialogs omitidos para brevidade, mas devem seguir o mesmo padrão de tipagem: (e: any) => ... */}
    </AppLayout>
  );
}