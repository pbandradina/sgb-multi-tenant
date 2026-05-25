import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { gerarPlanilhaFrequencia } from "../frequencia";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, "0.0.0.0", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Configuração de limites para upload/processamento de dados
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Rota de download da planilha de Controle de Frequência
  app.get("/api/frequencia/download", async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch {}
      
      if (!user) { res.status(401).json({ error: "Não autenticado" }); return; }
      const quartelId = parseInt(req.query.quartelId as string);
      const ano = parseInt(req.query.ano as string);
      const mes = parseInt(req.query.mes as string); // 0-indexed
      
      if (isNaN(quartelId) || isNaN(ano) || isNaN(mes)) {
        res.status(400).json({ error: "Parâmetros inválidos" }); return;
      }
      
      const MESES_NOME = ["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
      const buffer = await gerarPlanilhaFrequencia(quartelId, ano, mes);
      const filename = `CONTROLE_FREQUENCIA_${MESES_NOME[mes]}_${ano}.xlsx`;
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      console.error("[frequencia] Erro ao gerar planilha:", err);
      res.status(500).json({ error: "Erro ao gerar planilha" });
    }
  });

  // Middleware do tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Modo desenvolvimento usa Vite, produção usa arquivos estáticos (dist/client)
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = await findAvailablePort(parseInt(process.env.PORT || "3000"));

  server.listen(port, "0.0.0.0", () => {
    const networkIP = "10.41.237.41";
    console.log(`\n🚀 Sistema SGB Online!`);
    console.log(`Acesso Local: http://localhost:${port}/`);
    console.log(`Acesso na Rede: http://${networkIP}:${port}/\n`);
  });
}

// Inicializa o servidor e captura erros fatais
startServer().catch(console.error);