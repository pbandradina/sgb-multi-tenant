import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  const http = await import("http");
  const server = http.createServer(app);

  await setupVite(app, server);

  const PORT = 3000;

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
} else {
  serveStatic(app);
}

// EXPORTA O APP PARA VERCEL
export default app;