import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useQuartel } from "@/contexts/QuartelContext";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Building2, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SelectQuartel() {
  const { user, loading, isAuthenticated } = useAuth();
  const { setQuartel } = useQuartel();
  const [, navigate] = useLocation();

  const { data: myQuarteis, isLoading } = trpc.quartel.myQuarteis.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const handleSelectQuartel = (id: number, nome: string, sigla: string) => {
    setQuartel(id, nome, sigla);
    navigate("/dashboard");
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center w-20 h-20 mb-4">
            <img src="/manus-storage/brasao-20gb_96fbbfce.png" alt="Brasão 20º GB" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Selecionar Quartel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, <span className="text-foreground font-medium">{user?.name}</span>. Escolha seu quartel para continuar.
          </p>
        </div>

        {/* Quartel list */}
        <div className="space-y-3">
          {!myQuarteis || myQuarteis.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Você ainda não está associado a nenhum quartel.
              </p>
              <p className="text-xs text-muted-foreground">
                Solicite ao administrador do sistema para associar sua conta a um quartel.
              </p>
            </div>
          ) : (
            myQuarteis.map((item) => {
              const quartel = "quartel" in item ? item.quartel : item;
              const role = "role" in item ? item.role : "admin";
              return (
                <button
                  key={quartel.id}
                  onClick={() => handleSelectQuartel(quartel.id, quartel.nome, quartel.sigla ?? "")}
                  className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-card/80 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{(quartel.sigla ?? "N/A").slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      {quartel.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quartel.cidade && quartel.estado ? `${quartel.cidade} - ${quartel.estado}` : (quartel.sigla ?? "N/A")}
                      {" · "}
                      <span className="capitalize">{role === "admin" ? "Administrador" : "Operador"}</span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {user?.role === "admin" && (
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
            onClick={() => navigate("/admin")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Gerenciar Quarteis
          </Button>
        )}
      </div>
    </div>
  );
}
