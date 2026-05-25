import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  // Define que o Vite deve procurar o index.html e os assets dentro de /client
  root: "client",
  plugins: [
    react(),
    tailwindcss(), // Ativa o suporte nativo ao Tailwind 4
  ],
  build: {
    // O build final deve ir para a raiz/dist/client
    outDir: "../dist/client",
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  resolve: {
    alias: {
      // Ajuste dos aliases para apontar corretamente a partir da raiz
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});