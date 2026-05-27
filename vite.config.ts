import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const oauthServerUrl =
  process.env.VITE_OAUTH_PORTAL_URL ||
  process.env.VITE_OAUTH_SERVER_URL ||
  process.env.OAUTH_SERVER_URL ||
  "";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
const appId = process.env.VITE_APP_ID || process.env.APP_ID || "";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

export default defineConfig({
  // Define que o Vite deve procurar o index.html e os assets dentro de /client
  root: "client",
  define: {
    "import.meta.env.VITE_OAUTH_PORTAL_URL": JSON.stringify(
      process.env.VITE_OAUTH_PORTAL_URL || ""
    ),
    "import.meta.env.VITE_OAUTH_SERVER_URL": JSON.stringify(oauthServerUrl),
    "import.meta.env.OAUTH_SERVER_URL": JSON.stringify(oauthServerUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    "import.meta.env.VITE_APP_ID": JSON.stringify(appId),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
  },
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