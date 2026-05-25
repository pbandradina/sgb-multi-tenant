import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path"; // O prefixo node: ajuda na resolução do TS

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});