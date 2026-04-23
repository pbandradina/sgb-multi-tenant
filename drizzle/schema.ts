import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Quarteis - unidades de bombeiros (tenants)
 */
export const quarteis = mysqlTable("quarteis", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  sigla: varchar("sigla", { length: 20 }).notNull(),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quartel = typeof quarteis.$inferSelect;
export type InsertQuartel = typeof quarteis.$inferInsert;

/**
 * Associação entre usuários e quarteis (multi-tenant)
 */
export const quartelUsers = mysqlTable("quartel_users", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "operador"]).default("operador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuartelUser = typeof quartelUsers.$inferSelect;
export type InsertQuartelUser = typeof quartelUsers.$inferInsert;

/**
 * Bombeiros - efetivo por quartel
 */
export const bombeiros = mysqlTable("bombeiros", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  nome: varchar("nome", { length: 200 }).notNull(),
  posto: varchar("posto", { length: 100 }).notNull(),
  equipe: mysqlEnum("equipe", ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).notNull(),
  dataInicio: date("dataInicio", { mode: "string" }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bombeiro = typeof bombeiros.$inferSelect;
export type InsertBombeiro = typeof bombeiros.$inferInsert;

/**
 * Escalas de serviço - define quais equipes estão de prontidão em cada período
 */
export const escalas = mysqlTable("escalas", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  equipe: mysqlEnum("equipe", ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).notNull(),
  dataInicio: date("dataInicio", { mode: "string" }).notNull(),
  dataFim: date("dataFim", { mode: "string" }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Escala = typeof escalas.$inferSelect;
export type InsertEscala = typeof escalas.$inferInsert;

/**
 * Prontidões - registros de serviço realizados por bombeiro
 */
export const prontidoes = mysqlTable("prontidoes", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  bombeiroId: int("bombeiroId").notNull(),
  data: date("data", { mode: "string" }).notNull(),
  equipe: mysqlEnum("equipe", ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prontidao = typeof prontidoes.$inferSelect;
export type InsertProntidao = typeof prontidoes.$inferInsert;

/**
 * Histórico de vínculos bombeiro-prontidão por período
 * Permite rastrear mudanças de prontidão ao longo do ano
 */
export const bombeiroProntidaoHistorico = mysqlTable("bombeiro_prontidao_historico", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  bombeiroId: int("bombeiroId").notNull(),
  equipe: mysqlEnum("equipe", ["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).notNull(),
  dataInicio: date("dataInicio", { mode: "string" }).notNull(),
  dataFim: date("dataFim", { mode: "string" }),  // null = vigente até hoje
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BombeiroProntidaoHistorico = typeof bombeiroProntidaoHistorico.$inferSelect;
export type InsertBombeiroProntidaoHistorico = typeof bombeiroProntidaoHistorico.$inferInsert;

/**
 * Afastamentos - férias, licenças, dispensas médicas por bombeiro
 */
export const afastamentos = mysqlTable("afastamentos", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  bombeiroId: int("bombeiroId").notNull(),
  tipo: mysqlEnum("tipo", ["F", "LP", "LT", "DS", "FMO", "PA", "D", "C", "LTS", "CFS", "CAS", "EAP", "TAF", "ME", "AG"]).notNull(),
  dataInicio: date("dataInicio", { mode: "string" }).notNull(),
  dataFim: date("dataFim", { mode: "string" }).notNull(),
  descricao: text("descricao"),
  periodoConcessao: varchar("periodoConcessao", { length: 100 }),  // Ex: "01/02/2026 a 03/02/2026"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Afastamento = typeof afastamentos.$inferSelect;
export type InsertAfastamento = typeof afastamentos.$inferInsert;
