import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { EQUIPES_PRONTIDAO } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, TrendingDown, Minus, RefreshCw, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatGraduacao } from "../../../shared/utils";

const EQUIPE_COLORS: Record<string, { badge: string; text: string; short: string }> = {
  "Prontidão Verde":   { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", text: "text-emerald-400", short: "VD" },
  "Prontidão Amarela": { badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",       text: "text-amber-400",   short: "AM" },
  "Prontidão Azul":    { badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",          text: "text-blue-400",    short: "AZ" },
  "Administrativo":    { badge: "bg-slate-500/20 text-slate-400 border-slate-500/40",       text: "text-slate-400",   short: "ADM" },
};

export default function FolhasObrigatorias() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState("todas");

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId, navigate]);

  const { data: saldos, isLoading, refetch } = trpc.fo.saldoQuartel.useQuery({ quartelId: quartelId! }, { enabled: !!quartelId });

  const filtered = (saldos || []).filter((item: any) => {
    const nome = item.bombeiro?.nome?.toLowerCase() || "";
    return nome.includes(search.toLowerCase()) && (filterEquipe === "todas" || item.bombeiro?.equipe === filterEquipe);
  });

  if (loading || !quartelId) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <AppLayout title="Dashboard de FMO">
      <div className="space-y-4">
        <div className="flex gap-2">
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {EQUIPES_PRONTIDAO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button onClick={() => refetch()}><RefreshCw /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((item: any) => (
                <Card key={item.bombeiro.id} className="p-4">
                    <div className="font-bold">{(item.bombeiro as any).nomeGuerra || item.bombeiro.nome}</div>
                    <div className="text-sm opacity-60">{item.bombeiro.equipe}</div>
                    <div className="mt-2 text-2xl font-black">Saldo: {item.saldo?.saldoFMO ?? 0}</div>
                </Card>
            ))}
        </div>
      </div>
    </AppLayout>
  );
}