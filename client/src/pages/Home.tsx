import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Users, Calendar, BarChart3, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/selecionar-quartel");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10">
            <img src="/manus-storage/brasao-20gb_96fbbfce.png" alt="Brasão 20º GB" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>SGB</span>
            <span className="text-xs text-muted-foreground ml-2">Sistema de Gestão de Bombeiros</span>
          </div>
        </div>
        <Button
          onClick={() => window.location.href = getLoginUrl()}
          variant="outline"
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          Entrar
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8">
          <Shield className="w-3.5 h-3.5" />
          Plataforma Multi-Quartel
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 max-w-3xl leading-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Gestão de Efetivo{" "}
          <span className="text-primary">Inteligente</span>
          {" "}para Bombeiros
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-10">
          Controle escalas, prontidões, afastamentos e Folgas Obrigatórias de forma simples e eficiente. Cada quartel com seus dados isolados e seguros.
        </p>

        <Button
          onClick={() => window.location.href = getLoginUrl()}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
        >
          Acessar o Sistema
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {[
            { icon: Users, title: "Gestão de Efetivo", desc: "Cadastre e gerencie bombeiros por posto, graduação e prontidão (Verde, Azul, Amarela)" },
            { icon: Calendar, title: "Escalas e Prontidões", desc: "Visualize escalas em calendário dinâmico e registre prontidões automaticamente" },
            { icon: BarChart3, title: "Folgas Mensais Obrigatórias (FMO)", desc: "Cálculo automático de saldo de FMO baseado em prontidões e afastamentos" },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">SGB — Sistema de Gestão de Bombeiros © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
