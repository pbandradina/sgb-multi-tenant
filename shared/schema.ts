import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// --- USUÁRIOS ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: text("open_id").unique().notNull(),
  name: text("name"),
  email: text("email"),
  role: text("role").default("user"),
  loginMethod: text("login_method"),
  lastSignedIn: timestamp("last_signed_in"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- QUARTEIS ---
export const quarteis = pgTable("quarteis", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  sigla: text("sigla"), // Adicionado para o router
  cidade: text("cidade"),
  estado: text("estado"),
  ativo: boolean("ativo").default(true),
});

// --- BOMBEIROS ---
export const bombeiros = pgTable("bombeiros", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  nome: text("nome").notNull(),
  nomeGuerra: text("nome_guerra"),
  posto: text("posto").notNull(),
  equipe: text("equipe").notNull(),
  dataInicio: text("data_inicio").notNull(),
  ativo: boolean("ativo").default(true),
});

// --- ESCALAS (Nova) ---
export const escalas = pgTable("escalas", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  nome: text("nome").notNull(),
  data: timestamp("data").notNull(),
  ativa: boolean("ativa").default(true),
});

// --- RELACIONAMENTO USUÁRIO x QUARTEL (Nova) ---
export const usuariosQuarteis = pgTable("usuarios_quarteis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  quartelId: integer("quartel_id").references(() => quarteis.id).notNull(),
  role: text("role").$type<"admin" | "operador">().notNull(),
});

// --- AFASTAMENTOS E TROCAS ---
export const afastamentos = pgTable("afastamentos", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  bombeiroId: integer("bombeiro_id").references(() => bombeiros.id),
  tipo: text("tipo").notNull(),
  dataInicio: text("data_inicio").notNull(),
  dataFim: text("data_fim").notNull(),
  descricao: text("descricao"),
  periodoConcessao: text("periodo_concessao"),
});

export const trocasServico = pgTable("trocas_servico", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  bombeiroEntraId: integer("bombeiro_entra_id").references(() => bombeiros.id),
  bombeireSaiId: integer("bombeiro_sai_id").references(() => bombeiros.id),
  dataTroca: text("data_troca").notNull(),
  dataPagamento: text("data_pagamento"),
  numeroSEI: text("numero_sei"),
  numeroParte: text("numero_parte"),
  observacao: text("observacao"),
});

// --- PRONTIDÃO ---
export const prontidoes = pgTable("prontidoes", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  bombeiroId: integer("bombeiro_id").references(() => bombeiros.id),
  data: text("data").notNull(),
  equipe: text("equipe").notNull(), // "Prontidão Verde", "Prontidão Azul", "Prontidão Amarela"
  ativo: boolean("ativo").default(true),
});

// --- HISTÓRICO ---
export const historicos = pgTable("historicos", {
  id: serial("id").primaryKey(),
  quartelId: integer("quartel_id").references(() => quarteis.id),
  bombeiroId: integer("bombeiro_id").references(() => bombeiros.id),
  tipo: text("tipo").notNull(),
  data: timestamp("data").defaultNow(),
  descricao: text("descricao"),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InsertQuartel = typeof quarteis.$inferInsert;
export type InsertBombeiro = typeof bombeiros.$inferInsert;