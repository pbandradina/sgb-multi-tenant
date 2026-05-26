import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Carrega as variáveis do arquivo .env para o process.env
dotenv.config();

export default defineConfig({
  schema: "./shared/schema.ts", // ajuste para o caminho real do seu schema
  out: "./drizzle",
  dialect: "postgresql", // ou 'mysql' / 'sqlite' dependendo do seu projeto
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});