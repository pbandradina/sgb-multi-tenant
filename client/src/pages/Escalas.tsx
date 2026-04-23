import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { TeamBadge, getEquipeColor, EQUIPES, type Equipe } from "@/components/TeamBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export default function Escalas() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ equipe: "Prontidão Verde" as Equipe, dataInicio: "", dataFim: "", turno: "24h" });

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

  const { data: escalas, isLoading } = trpc.escala.list.useQuery(
    { quartelId: quartelId!, dataInicio: firstDay, dataFim: lastDay },
    { enabled: !!quartelId }
  );

  const utils = trpc.useUtils();
  const createMutation = trpc.escala.create.useMutation({
    onSuccess: () => {
      utils.escala.list.invalidate();
      setShowAdd(false);
      setForm({ equipe: "Prontidão Verde", dataInicio: "", dataFim: "", turno: "24h" });
      toast.success("Escala criada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Build calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  // Map escalas por dia
  const escalasByDay = useMemo(() => {
    const map: Record<number, typeof escalas> = {};
    if (!escalas) return map;
    escalas.forEach((e: any) => {
      const start = new Date(e.dataInicio);
      const end = new Date(e.dataFim);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day]!.push(e);
        }
      }
    });
    return map;
  }, [escalas, month, year]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleSubmit = () => {
    if (!form.dataInicio || !form.dataFim) { toast.error("Preencha as datas."); return; }
    createMutation.mutate({
      quartelId: quartelId!,
      equipe: form.equipe,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      observacao: form.turno,
    });
  };

  if (loading || !quartelId) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const today = new Date();

  return (
    <AppLayout title="Escalas de Serviço">
      <div className="space-y-5">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth} className="border-border">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {MESES[month]} {year}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth} className="border-border">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {EQUIPES.map(eq => (
                <div key={eq} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getEquipeColor(eq) + "60" }} />
                  <span className="text-xs text-muted-foreground">{eq === "Administrativo" ? "Admin" : eq.replace("Prontidão ", "")}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
              <Plus className="w-4 h-4 mr-2" />Nova Escala
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/20">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const dayEscalas = day ? (escalasByDay[day] || []) : [];
                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[80px] p-1.5 border-b border-r border-border/50 last:border-r-0",
                      !day && "bg-secondary/10",
                      isToday && "bg-primary/5"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1",
                          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayEscalas.slice(0, 3).map((e: any, i: number) => {
                            const color = getEquipeColor(e.equipe as Equipe);
                            const shortName = (e.equipe as string) === "Administrativo" ? "Admin" : (e.equipe as string).replace("Prontidão ", "");
                            return (
                              <div
                                key={i}
                                className="text-xs px-1 py-0.5 rounded truncate font-medium"
                                style={{
                                  backgroundColor: color + "25",
                                  color: color,
                                  borderLeft: `2px solid ${color}`,
                                }}
                              >
                                {shortName}
                              </div>
                            );
                          })}
                          {dayEscalas.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">+{dayEscalas.length - 3}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Escalas list */}
        {escalas && escalas.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Escalas de {MESES[month]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {escalas.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <TeamBadge equipe={e.equipe as Equipe} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{e.equipe}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.dataInicio).toLocaleDateString("pt-BR")} — {new Date(e.dataFim).toLocaleDateString("pt-BR")}
                          {e.observacao ? ` · ${e.observacao}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Montserrat, sans-serif" }}>Nova Escala de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Prontidão / Equipe *</Label>
              <Select value={form.equipe} onValueChange={v => setForm(f => ({ ...f, equipe: v as Equipe }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPES.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
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
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Turno</Label>
              <Select value={form.turno} onValueChange={v => setForm(f => ({ ...f, turno: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="12h">12 horas</SelectItem>
                  <SelectItem value="diurno">Diurno</SelectItem>
                  <SelectItem value="noturno">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Escala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
