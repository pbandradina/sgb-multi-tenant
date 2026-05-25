import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  // Força o modo produção no servidor se não houver variável definida
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 3000;

  // Escuta em 0.0.0.0 para aceitar conexões da rede
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n-------------------------------------------`);
    console.log(`🚀 SGB OPERACIONAL NO IP: 10.41.237.41`);
    console.log(`📡 Porta: ${PORT}`);
    console.log(`-------------------------------------------\n`);
  });
}

startServer().catch((err) => {
  console.error("❌ ERRO FATAL AO INICIAR SERVIDOR:", err);
});