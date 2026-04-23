import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { QuartelProvider } from "./contexts/QuartelContext";
import Home from "./pages/Home";
import SelectQuartel from "./pages/SelectQuartel";
import Dashboard from "./pages/Dashboard";
import Bombeiros from "./pages/Bombeiros";
import Escalas from "./pages/Escalas";
import Afastamentos from "./pages/Afastamentos";
import FolhasObrigatorias from "./pages/FolhasObrigatorias";
import Relatorios from "./pages/Relatorios";
import AdminPanel from "./pages/AdminPanel";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/selecionar-quartel"} component={SelectQuartel} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/bombeiros"} component={Bombeiros} />
      <Route path={"/escalas"} component={Escalas} />
      <Route path={"/afastamentos"} component={Afastamentos} />
      <Route path={"/fo"} component={FolhasObrigatorias} />
      <Route path={"/relatorios"} component={Relatorios} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <QuartelProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QuartelProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
