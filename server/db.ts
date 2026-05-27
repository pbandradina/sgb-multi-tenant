import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não encontrada no arquivo .env");
}

// IMPORTANTE:
// prepare: false é obrigatório para Supabase Pooler + Vercel
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});

export const db = drizzle(client, { schema });

// --- UTILITY FUNCTIONS ---
export function getDb() {
  return db;
}

export function parseDateLocal(dateString: string): Date {
  // Parse date string in format YYYY-MM-DD to local date
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// --- USUÁRIOS ---
export async function getUserByOpenId(openId: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.openId, openId));
  return user;
}

// --- BOMBEIROS ---
export async function getBombeiros() {
  return await db.select().from(schema.bombeiros);
}

export async function createBombeiro(data: any) {
  const [newBombeiro] = await db.insert(schema.bombeiros).values(data).returning();
  return newBombeiro;
}

export async function updateBombeiro(id: number, quartelId: number, data: any) {
  const [updated] = await db
    .update(schema.bombeiros)
    .set(data)
    .where(and(eq(schema.bombeiros.id, id), eq(schema.bombeiros.quartelId, quartelId)))
    .returning();
  return updated;
}

export async function deleteBombeiro(id: number, quartelId: number) {
  return await db
    .delete(schema.bombeiros)
    .where(and(eq(schema.bombeiros.id, id), eq(schema.bombeiros.quartelId, quartelId)));
}

// --- QUARTEL ---
export async function getAllQuarteis() {
  return await db.select().from(schema.quarteis);
}

export async function getQuartelById(id: number) {
  const [quartel] = await db.select().from(schema.quarteis).where(eq(schema.quarteis.id, id));
  return quartel;
}

export async function createQuartel(data: any) {
  const [newQuartel] = await db.insert(schema.quarteis).values(data).returning();
  return newQuartel;
}

export async function updateQuartel(id: number, data: any) {
  return await db.update(schema.quarteis).set(data).where(eq(schema.quarteis.id, id));
}

export async function deleteQuartel(id: number) {
  return await db.delete(schema.quarteis).where(eq(schema.quarteis.id, id));
}

// --- RELACIONAMENTOS QUARTEL ---
export async function getQuartelsByUserId(userId: number) {
  return await db
    .select({ quartel: schema.quarteis, role: schema.usuariosQuarteis.role })
    .from(schema.usuariosQuarteis)
    .innerJoin(schema.quarteis, eq(schema.usuariosQuarteis.quartelId, schema.quarteis.id))
    .where(eq(schema.usuariosQuarteis.userId, userId));
}

export async function getUsersByQuartelId(quartelId: number) {
  return await db
    .select({ user: schema.users, role: schema.usuariosQuarteis.role })
    .from(schema.usuariosQuarteis)
    .innerJoin(schema.users, eq(schema.usuariosQuarteis.userId, schema.users.id))
    .where(eq(schema.usuariosQuarteis.quartelId, quartelId));
}

export async function addUserToQuartel(quartelId: number, userId: number, role: "admin" | "operador") {
  return await db
    .insert(schema.usuariosQuarteis)
    .values({ quartelId, userId, role })
    .onConflictDoUpdate({
      target: [schema.usuariosQuarteis.userId, schema.usuariosQuarteis.quartelId],
      set: { role },
    });
}

export async function removeUserFromQuartel(userId: number, quartelId: number) {
  return await db
    .delete(schema.usuariosQuarteis)
    .where(and(eq(schema.usuariosQuarteis.userId, userId), eq(schema.usuariosQuarteis.quartelId, quartelId)));
}

// --- ESCALAS ---
export async function getEscalas() {
  return await db.select().from(schema.escalas);
}

export async function createEscala(data: any) {
  const [newEscala] = await db.insert(schema.escalas).values(data).returning();
  return newEscala;
}

export async function deleteEscala(id: number) {
  return await db.delete(schema.escalas).where(eq(schema.escalas.id, id));
}

// --- USERS ---
export async function upsertUser(data: any) {
  const [user] = await db
    .insert(schema.users)
    .values(data)
    .onConflictDoUpdate({
      target: [schema.users.openId],
      set: data,
    })
    .returning();
  return user;
}

// --- BOMBEIROS EXTENDED ---
export async function getBombeirosByQuartel(quartelId: number) {
  return await db.select().from(schema.bombeiros).where(eq(schema.bombeiros.quartelId, quartelId));
}

export async function getBombeiroById(id: number, quartelId: number) {
  const [bombeiro] = await db
    .select()
    .from(schema.bombeiros)
    .where(and(eq(schema.bombeiros.id, id), eq(schema.bombeiros.quartelId, quartelId)));
  return bombeiro;
}

// --- AFASTAMENTOS ---
export async function getAfastamentosByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  let query = db.select().from(schema.afastamentos).where(eq(schema.afastamentos.quartelId, quartelId));
  return await query;
}

export async function getAfastamentosByBombeiro(bombeiroId: number, quartelId: number) {
  return await db
    .select()
    .from(schema.afastamentos)
    .where(and(eq(schema.afastamentos.bombeiroId, bombeiroId), eq(schema.afastamentos.quartelId, quartelId)));
}

export async function getAfastamentosAtivos(quartelId: number, today: string) {
  return await db
    .select()
    .from(schema.afastamentos)
    .where(eq(schema.afastamentos.quartelId, quartelId));
}

export async function createAfastamento(data: any) {
  const [afastamento] = await db.insert(schema.afastamentos).values(data).returning();
  return afastamento;
}

export async function deleteAfastamento(id: number, quartelId: number) {
  return await db
    .delete(schema.afastamentos)
    .where(and(eq(schema.afastamentos.id, id), eq(schema.afastamentos.quartelId, quartelId)));
}

export async function updateAfastamento(id: number, quartelId: number, data: any) {
  const [updated] = await db
    .update(schema.afastamentos)
    .set(data)
    .where(and(eq(schema.afastamentos.id, id), eq(schema.afastamentos.quartelId, quartelId)))
    .returning();
  return updated;
}

export async function calcularSaldoFMO(bombeiroId: number, quartelId: number): Promise<number> {
  // TODO: Implement FMO balance calculation based on afastamentos history
  return 0;
}

// --- TROCAS SERVIÇO ---
export async function getTrocasByQuartel(quartelId: number, ano?: number, mes?: number) {
  return await db.select().from(schema.trocasServico).where(eq(schema.trocasServico.quartelId, quartelId));
}

export async function createTroca(data: any) {
  const [troca] = await db.insert(schema.trocasServico).values(data).returning();
  return troca;
}

export async function deleteTroca(id: number, quartelId: number) {
  return await db
    .delete(schema.trocasServico)
    .where(and(eq(schema.trocasServico.id, id), eq(schema.trocasServico.quartelId, quartelId)));
}

export async function updateTroca(id: number, quartelId: number, data: any) {
  const [updated] = await db
    .update(schema.trocasServico)
    .set(data)
    .where(and(eq(schema.trocasServico.id, id), eq(schema.trocasServico.quartelId, quartelId)))
    .returning();
  return updated;
}

// --- PRONTIDÃO ---
export async function getProntidoesByBombeiro(bombeiroId: number, quartelId: number) {
  if (!schema.prontidoes) return [];
  return await db
    .select()
    .from(schema.prontidoes)
    .where(and(eq(schema.prontidoes.bombeiroId, bombeiroId), eq(schema.prontidoes.quartelId, quartelId)));
}

export async function getProntidoesByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  if (!schema.prontidoes) return [];
  return await db.select().from(schema.prontidoes).where(eq(schema.prontidoes.quartelId, quartelId));
}

export async function createProntidao(data: any) {
  if (!schema.prontidoes) throw new Error("Prontidoes table not defined");
  const [prontidao] = await db.insert(schema.prontidoes).values(data).returning();
  return prontidao;
}

export async function deleteProntidao(id: number, quartelId: number) {
  if (!schema.prontidoes) return;
  return await db
    .delete(schema.prontidoes)
    .where(and(eq(schema.prontidoes.id, id), eq(schema.prontidoes.quartelId, quartelId)));
}

// --- HISTÓRICO ---
export async function getHistoricoByBombeiro(bombeiroId: number, quartelId: number) {
  if (!schema.historicos) return [];
  return await db
    .select()
    .from(schema.historicos)
    .where(and(eq(schema.historicos.bombeiroId, bombeiroId), eq(schema.historicos.quartelId, quartelId)));
}

export async function getHistoricoByQuartel(quartelId: number) {
  if (!schema.historicos) return [];
  return await db.select().from(schema.historicos).where(eq(schema.historicos.quartelId, quartelId));
}

export async function createHistorico(data: any) {
  if (!schema.historicos) throw new Error("Historicos table not defined");
  const [historico] = await db.insert(schema.historicos).values(data).returning();
  return historico;
}

export async function deleteHistorico(id: number, quartelId: number) {
  if (!schema.historicos) return;
  return await db
    .delete(schema.historicos)
    .where(and(eq(schema.historicos.id, id), eq(schema.historicos.quartelId, quartelId)));
}

// --- ACCESS CONTROL ---
export async function getUserQuartelRole(userId: number, quartelId: number) {
  const [relation] = await db
    .select({ role: schema.usuariosQuarteis.role })
    .from(schema.usuariosQuarteis)
    .where(and(eq(schema.usuariosQuarteis.userId, userId), eq(schema.usuariosQuarteis.quartelId, quartelId)));
  return relation?.role ?? null;
}