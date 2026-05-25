import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // --- LÓGICA DE CAMINHO ABSOLUTO À PROVA DE ERROS ---
  // process.cwd() no PM2 deve ser C:\Projetos\sgb-multi-tenant
  const rootDir = process.cwd();
  const distPath = path.resolve(rootDir, "dist", "client");
  const indexPath = path.resolve(distPath, "index.html");

  console.log(`[SGB-STATIC] Tentando servir arquivos de: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[SGB-STATIC] ❌ ERRO: Pasta dist/client não encontrada!`);
  }

  // Entrega os arquivos estáticos (JS, CSS, Imagens)
  // 'index: false' evita que o express-static tente adivinhar o index antes do nosso fallback
  app.use(express.static(distPath, { index: false }));

  // Fallback para o React Router: qualquer rota que não for arquivo, entrega o index.html
  app.use("*", (req, res) => {
    // Evita loop infinito em chamadas de API inexistentes
    if (req.originalUrl.startsWith("/api")) {
      return res.status(404).json({ error: "API Endpoint not found" });
    }

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`
        <div style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
          <h2 style="color: #e11d48;">Erro de Inicialização do Frontend</h2>
          <p>O servidor backend está rodando, mas não encontrou os arquivos do site.</p>
          <p>Localização verificada: <code>${indexPath}</code></p>
          <hr />
          <p><b>Ação necessária:</b> Vá ao terminal do servidor e execute: <code>npm run build</code></p>
        </div>
      `);
    }
  });
}