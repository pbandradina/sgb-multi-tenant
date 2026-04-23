import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  quarteis,
  quartelUsers,
  bombeiros,
  escalas,
  prontidoes,
  afastamentos,
  InsertQuartel,
  InsertBombeiro,
  InsertEscala,
  InsertProntidao,
  InsertAfastamento,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Quarteis ─────────────────────────────────────────────────────────────────

export async function getAllQuarteis() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quarteis).orderBy(quarteis.nome);
}

export async function getQuartelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quarteis).where(eq(quarteis.id, id)).limit(1);
  return result[0];
}

export async function createQuartel(data: InsertQuartel) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(quarteis).values(data);
  return result;
}

export async function updateQuartel(id: number, data: Partial<InsertQuartel>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(quarteis).set(data).where(eq(quarteis.id, id));
}

export async function deleteQuartel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(quarteis).where(eq(quarteis.id, id));
}

// ─── QuartelUsers ─────────────────────────────────────────────────────────────

export async function getQuartelsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ quartel: quarteis, role: quartelUsers.role })
    .from(quartelUsers)
    .innerJoin(quarteis, eq(quartelUsers.quartelId, quarteis.id))
    .where(and(eq(quartelUsers.userId, userId), eq(quarteis.ativo, true)));
  return rows;
}

export async function getUsersByQuartelId(quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ user: users, role: quartelUsers.role })
    .from(quartelUsers)
    .innerJoin(users, eq(quartelUsers.userId, users.id))
    .where(eq(quartelUsers.quartelId, quartelId));
}

export async function addUserToQuartel(quartelId: number, userId: number, role: "admin" | "operador" = "operador") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(quartelUsers)
    .values({ quartelId, userId, role })
    .onDuplicateKeyUpdate({ set: { role } });
}

export async function getUserQuartelRole(userId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(quartelUsers)
    .where(and(eq(quartelUsers.userId, userId), eq(quartelUsers.quartelId, quartelId)))
    .limit(1);
  return result[0];
}

export async function removeUserFromQuartel(userId: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(quartelUsers)
    .where(and(eq(quartelUsers.userId, userId), eq(quartelUsers.quartelId, quartelId)));
}

// ─── Bombeiros ────────────────────────────────────────────────────────────────

export async function getBombeirosByQuartel(quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.quartelId, quartelId), eq(bombeiros.ativo, true)))
    .orderBy(bombeiros.equipe, bombeiros.nome);
}

export async function getBombeiroById(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.id, id), eq(bombeiros.quartelId, quartelId)))
    .limit(1);
  return result[0];
}

export async function createBombeiro(data: InsertBombeiro) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(bombeiros).values(data);
  return result;
}

export async function updateBombeiro(id: number, quartelId: number, data: Partial<InsertBombeiro>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(bombeiros)
    .set(data)
    .where(and(eq(bombeiros.id, id), eq(bombeiros.quartelId, quartelId)));
}

export async function deleteBombeiro(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Soft delete
  await db
    .update(bombeiros)
    .set({ ativo: false })
    .where(and(eq(bombeiros.id, id), eq(bombeiros.quartelId, quartelId)));
}

// ─── Escalas ──────────────────────────────────────────────────────────────────

export async function getEscalasByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [eq(escalas.quartelId, quartelId)];
  if (dataInicio) conditions.push(sql`${escalas.dataInicio} >= ${dataInicio}` as any);
  if (dataFim) conditions.push(sql`${escalas.dataFim} <= ${dataFim}` as any);
  return db.select().from(escalas).where(and(...conditions)).orderBy(escalas.dataInicio);
}

export async function createEscala(data: InsertEscala) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(escalas).values(data);
}

export async function deleteEscala(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(escalas)
    .where(and(eq(escalas.id, id), eq(escalas.quartelId, quartelId)));
}

// ─── Prontidões ───────────────────────────────────────────────────────────────

export async function getProntidoesByBombeiro(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(prontidoes)
    .where(and(eq(prontidoes.bombeiroId, bombeiroId), eq(prontidoes.quartelId, quartelId)))
    .orderBy(desc(prontidoes.data));
}

export async function getProntidoesByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [eq(prontidoes.quartelId, quartelId)];
  if (dataInicio) conditions.push(sql`${prontidoes.data} >= ${dataInicio}` as any);
  if (dataFim) conditions.push(sql`${prontidoes.data} <= ${dataFim}` as any);
  return db.select().from(prontidoes).where(and(...conditions)).orderBy(desc(prontidoes.data));
}

export async function createProntidao(data: InsertProntidao) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(prontidoes).values(data);
}

export async function deleteProntidao(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(prontidoes)
    .where(and(eq(prontidoes.id, id), eq(prontidoes.quartelId, quartelId)));
}

// ─── Afastamentos ─────────────────────────────────────────────────────────────

export async function getAfastamentosByQuartel(quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ afastamento: afastamentos, bombeiro: bombeiros })
    .from(afastamentos)
    .innerJoin(bombeiros, eq(afastamentos.bombeiroId, bombeiros.id))
    .where(eq(afastamentos.quartelId, quartelId))
    .orderBy(desc(afastamentos.dataInicio));
}

export async function getAfastamentosByBombeiro(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(afastamentos)
    .where(and(eq(afastamentos.bombeiroId, bombeiroId), eq(afastamentos.quartelId, quartelId)))
    .orderBy(desc(afastamentos.dataInicio));
}

export async function getAfastamentosAtivos(quartelId: number, hoje: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ afastamento: afastamentos, bombeiro: bombeiros })
    .from(afastamentos)
    .innerJoin(bombeiros, eq(afastamentos.bombeiroId, bombeiros.id))
    .where(
      and(
        eq(afastamentos.quartelId, quartelId),
        sql`${afastamentos.dataInicio} <= ${hoje}`,
        sql`${afastamentos.dataFim} >= ${hoje}`
      )
    );
}

export async function createAfastamento(data: InsertAfastamento) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(afastamentos).values(data);
}

export async function deleteAfastamento(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(afastamentos)
    .where(and(eq(afastamentos.id, id), eq(afastamentos.quartelId, quartelId)));
}

// ─── FO (Folgas Obrigatórias) ─────────────────────────────────────────────────
// Regra: a cada 2 prontidões realizadas, o bombeiro tem direito a 1 FO.
// Afastamentos não contam como prontidão.

export async function calcularSaldoFO(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return { totalProntidoes: 0, totalFOGeradas: 0, saldoFO: 0 };

  const totalProntidoes = await db
    .select()
    .from(prontidoes)
    .where(and(eq(prontidoes.bombeiroId, bombeiroId), eq(prontidoes.quartelId, quartelId)));

  const totalFOGeradas = Math.floor(totalProntidoes.length / 2);

  // FO usadas = afastamentos do tipo "dispensa" (FO utilizada)
  const foUsadas = await db
    .select()
    .from(afastamentos)
    .where(
      and(
        eq(afastamentos.bombeiroId, bombeiroId),
        eq(afastamentos.quartelId, quartelId),
        eq(afastamentos.tipo, "dispensa")
      )
    );

  const saldoFO = totalFOGeradas - foUsadas.length;

  return {
    totalProntidoes: totalProntidoes.length,
    totalFOGeradas,
    foUsadas: foUsadas.length,
    saldoFO: Math.max(0, saldoFO),
  };
}
