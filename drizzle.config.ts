import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Carrega variáveis do .env
dotenv.config();

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    // Usa conexão direta para migrações
    url: process.env.DATABASE_URL_DIRECT!,
  },
});