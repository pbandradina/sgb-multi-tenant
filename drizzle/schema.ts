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
  equipe: mysqlEnum("equipe", ["VD", "VA", "VB", "VC"]).notNull(),
  dataInicio: date("dataInicio").notNull(),
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
  equipe: mysqlEnum("equipe", ["VD", "VA", "VB", "VC"]).notNull(),
  dataInicio: date("dataInicio").notNull(),
  dataFim: date("dataFim").notNull(),
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
  data: date("data").notNull(),
  equipe: mysqlEnum("equipe", ["VD", "VA", "VB", "VC"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prontidao = typeof prontidoes.$inferSelect;
export type InsertProntidao = typeof prontidoes.$inferInsert;

/**
 * Afastamentos - férias, licenças, dispensas médicas por bombeiro
 */
export const afastamentos = mysqlTable("afastamentos", {
  id: int("id").autoincrement().primaryKey(),
  quartelId: int("quartelId").notNull(),
  bombeiroId: int("bombeiroId").notNull(),
  tipo: mysqlEnum("tipo", ["ferias", "licenca_medica", "dispensa", "outros"]).notNull(),
  dataInicio: date("dataInicio").notNull(),
  dataFim: date("dataFim").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Afastamento = typeof afastamentos.$inferSelect;
export type InsertAfastamento = typeof afastamentos.$inferInsert;
