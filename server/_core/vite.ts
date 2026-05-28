import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config.ts";

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
      // No desenvolvimento, o index.html está na pasta client na raiz
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // CORREÇÃO ESTRATÉGICA DE CAMINHO:
  // O servidor roda em /dist/server/index.js
  // Os arquivos do site estão em /dist/client/
  const distPath = path.resolve(process.cwd(), "dist", "client");

  if (!fs.existsSync(distPath)) {
    console.error(
      `ERRO CRÍTICO: Pasta de build não encontrada em: ${distPath}. Verifique se rodou 'npm run build'.`
    );
  }

  // Serve os arquivos estáticos (JS, CSS, Imagens)
  app.use(express.static(distPath));

  // Qualquer rota que não for arquivo, entrega o index.html (essencial para o React)
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Erro: index.html de produção não encontrado no servidor.");
    }
  });
}