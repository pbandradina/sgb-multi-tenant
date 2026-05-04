import { useAuth } from "@/_core/hooks/useAuth";
import { useQuartel } from "@/contexts/QuartelContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Download, FileSpreadsheet, Info } from "lucide-react";
import { toast } from "sonner";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function ControleFrequencia() {
  const { loading, isAuthenticated } = useAuth();
  const { quartelId } = useQuartel();
  const [, navigate] = useLocation();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0-indexed
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) { window.location.href = getLoginUrl(); return; }
    if (!loading && isAuthenticated && !quartelId) navigate("/selecionar-quartel");
  }, [loading, isAuthenticated, quartelId]);

  async function handleDownload() {
    if (!quartelId) return;
    setBaixando(true);
    try {
      const url = `/api/frequencia/download?quartelId=${quartelId}&ano=${ano}&mes=${mes}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Erro ao gerar planilha");
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const MESES_NOME = ["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
      link.download = `CONTROLE_FREQUENCIA_${MESES_NOME[mes]}_${ano}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Planilha gerada com sucesso!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar planilha");
    } finally {
      setBaixando(false);
    }
  }

  if (loading || !quartelId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

  return (
    <AppLayout title="Controle de Frequência">
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* Card principal */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Gerar Planilha de Controle de Frequência</h2>
              <p className="text-xs text-muted-foreground">Selecione o mês e ano para gerar a planilha XLSX</p>
            </div>
          </div>

          {/* Seletores */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</label>
              <select
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer"
                value={mes}
                onChange={e => setMes(Number(e.target.value))}
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</label>
              <select
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer"
                value={ano}
                onChange={e => setAno(Number(e.target.value))}
              >
                {anos.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão de download */}
          <Button
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleDownload}
            disabled={baixando}
            size="lg"
          >
            {baixando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando planilha...</>
              : <><Download className="w-4 h-4" /> Baixar Planilha — {MESES[mes]} {ano}</>
            }
          </Button>
        </Card>

        {/* Legenda */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Legenda da Planilha</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: "3", desc: "18h a 24h trabalhadas (dia de serviço)", cor: "bg-blue-900/40 text-blue-300" },
              { valor: "2", desc: "12h a 18h trabalhadas", cor: "bg-blue-900/20 text-blue-400" },
              { valor: "1", desc: "8h a 12h trabalhadas", cor: "bg-blue-900/10 text-blue-500" },
              { valor: "0", desc: "Inferior a 8h trabalhadas", cor: "bg-secondary text-muted-foreground" },
              { valor: "A", desc: "Demais afastamentos", cor: "bg-slate-700/50 text-slate-300" },
              { valor: "F", desc: "Férias", cor: "bg-yellow-900/40 text-yellow-300" },
              { valor: "LP", desc: "Licença Prêmio", cor: "bg-yellow-900/30 text-yellow-400" },
              { valor: "FS", desc: "Falta ao Serviço", cor: "bg-red-900/40 text-red-300" },
            ].map(item => (
              <div key={item.valor} className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/30">
                <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-black min-w-[28px] ${item.cor}`}>
                  {item.valor}
                </span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">DA</strong> — Total de horas (soma ponderada: 0×n₀ + 1×n₁ + 2×n₂ + 3×n₃)
            </p>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">AA</strong> — Total de dias com presença (qualquer valor numérico conta como 1)
            </p>
          </div>
        </Card>

        {/* Nota sobre preenchimento automático */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
          <span className="text-muted-foreground mt-0.5 flex-shrink-0 text-sm">ℹ</span>
          <p className="text-xs text-muted-foreground">
            A planilha é preenchida automaticamente com base nos afastamentos registrados no calendário.
            Dias de serviço da prontidão do bombeiro recebem o valor <strong className="text-foreground">3</strong> (18-24h).
            Dias sem registro e sem serviço ficam em branco. Trocas de serviço são consideradas automaticamente.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
