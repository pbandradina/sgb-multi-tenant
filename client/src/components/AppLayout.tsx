import { useAuth } from "@/_core/hooks/useAuth";
import { useQuartel } from "@/contexts/QuartelContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FileText,
  BarChart3,
  Shield,
  LogOut,
  ChevronRight,
  Flame,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bombeiros", label: "Bombeiros", icon: Users },
  { href: "/escalas", label: "Escalas", icon: Calendar },
  { href: "/afastamentos", label: "Afastamentos", icon: ClipboardList },
  { href: "/fo", label: "Folgas Obrigatórias", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { quartelNome, quartelSigla, clearQuartel } = useQuartel();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleChangeQuartel = () => {
    clearQuartel();
    window.location.href = "/selecionar-quartel";
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r border-border transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20 border border-primary/30">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tracking-wide" style={{ fontFamily: "Montserrat, sans-serif" }}>SGB</p>
            <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Quartel info */}
        <button
          onClick={handleChangeQuartel}
          className="flex items-center gap-3 mx-3 mt-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group"
        >
          <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold text-primary truncate">{quartelSigla || "Quartel"}</p>
            <p className="text-xs text-muted-foreground truncate">{quartelNome || "Selecionar quartel"}</p>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/15 text-primary border-l-2 border-primary pl-[10px]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "")} />
                  {item.label}
                </a>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link href="/admin">
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mt-2 border-t border-border pt-4",
                  location === "/admin"
                    ? "bg-primary/15 text-primary border-l-2 border-primary pl-[10px]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                Painel Admin
              </a>
            </Link>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            {title && (
              <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
