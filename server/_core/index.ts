import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";
import { gerarPlanilhaFrequencia } from "../frequencia.js";
import { sdk } from "./sdk.js";

// --- COMPATIBILIDADE PARA ES MODULES (Resolve o erro do __dirname) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Disponibiliza globalmente para outros módulos importados que possam precisar
// @ts-ignore
global.__dirname = __dirname;
// ---------------------------------------------------------------------

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
  
  // Configure body parser with larger size limit for file uploads
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

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Aqui é onde o __dirname era necessário
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Escuta explicitamente em 0.0.0.0 para aceitar conexões externas da rede
  server.listen(port, "0.0.0.0", () => {
    const networkIP = "10.41.237.41"; // Seu IP identificado anteriormente
    console.log(`\n🚀 Sistema SGB Online!`);
    console.log(`Acesso Local: http://localhost:${port}/`);
    console.log(`Acesso na Rede: http://${networkIP}:${port}/\n`);
  });
}

startServer().catch(console.error);