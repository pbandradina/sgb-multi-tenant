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
  bombeiroProntidaoHistorico,
  InsertQuartel,
  InsertBombeiro,
  InsertEscala,
  InsertProntidao,
  InsertAfastamento,
  InsertBombeiroProntidaoHistorico,
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

// ─── Histórico de Vínculos Bombeiro-Prontidão ─────────────────────────────────────

export async function getHistoricoByBombeiro(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bombeiroProntidaoHistorico)
    .where(and(eq(bombeiroProntidaoHistorico.bombeiroId, bombeiroId), eq(bombeiroProntidaoHistorico.quartelId, quartelId)))
    .orderBy(desc(bombeiroProntidaoHistorico.dataInicio));
}

export async function getHistoricoByQuartel(quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ historico: bombeiroProntidaoHistorico, bombeiro: bombeiros })
    .from(bombeiroProntidaoHistorico)
    .innerJoin(bombeiros, eq(bombeiroProntidaoHistorico.bombeiroId, bombeiros.id))
    .where(eq(bombeiroProntidaoHistorico.quartelId, quartelId))
    .orderBy(desc(bombeiroProntidaoHistorico.dataInicio));
}

export async function createHistorico(data: InsertBombeiroProntidaoHistorico) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Fechar o registro vigente anterior do mesmo bombeiro (sem dataFim)
  await db
    .update(bombeiroProntidaoHistorico)
    .set({ dataFim: data.dataInicio })
    .where(
      and(
        eq(bombeiroProntidaoHistorico.bombeiroId, data.bombeiroId),
        eq(bombeiroProntidaoHistorico.quartelId, data.quartelId),
        sql`${bombeiroProntidaoHistorico.dataFim} IS NULL`
      )
    );
  return db.insert(bombeiroProntidaoHistorico).values(data);
}

export async function deleteHistorico(id: number, quartelId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(bombeiroProntidaoHistorico)
    .where(and(eq(bombeiroProntidaoHistorico.id, id), eq(bombeiroProntidaoHistorico.quartelId, quartelId)));
}

/**
 * Retorna a equipe vigente de um bombeiro em uma data específica.
 * Prioridade: histórico de vínculos > campo equipe atual do bombeiro.
 */
export async function getEquipeBombeiroNaData(bombeiroId: number, quartelId: number, data: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  // Buscar no histórico o vínculo ativo na data
  const rows = await db
    .select()
    .from(bombeiroProntidaoHistorico)
    .where(
      and(
        eq(bombeiroProntidaoHistorico.bombeiroId, bombeiroId),
        eq(bombeiroProntidaoHistorico.quartelId, quartelId),
        sql`${bombeiroProntidaoHistorico.dataInicio} <= ${data}`,
        sql`(${bombeiroProntidaoHistorico.dataFim} IS NULL OR ${bombeiroProntidaoHistorico.dataFim} > ${data})`
      )
    )
    .orderBy(desc(bombeiroProntidaoHistorico.dataInicio))
    .limit(1);
  if (rows.length > 0) return rows[0].equipe;
  // Fallback: usar equipe atual do bombeiro
  const bombeiroRows = await db.select().from(bombeiros).where(and(eq(bombeiros.id, bombeiroId), eq(bombeiros.quartelId, quartelId))).limit(1);
  return bombeiroRows[0]?.equipe ?? null;
}

// ─── FMO (Folgas Mensais Obrigatórias) ───────────────────────────────────────────────
// Regra: a cada 2 dias de serviço (escalas) o bombeiro tem direito a 1 FMO.
// O cálculo é AUTOMÁTICO: cruza os dias de escala de cada prontidão com o
// histórico de vínculos do bombeiro (bombeiro_prontidao_historico).
// Se não houver histórico, usa a equipe atual do bombeiro desde dataInicio.
// Bombeiros da equipe Administrativo não entram no cálculo.

/**
 * Conta quantos dias de escala de uma prontidão específica caem dentro de um intervalo de datas.
 * Considera que as escalas podem ser por período (dataInicio a dataFim).
 */
function contarDiasEscalaNoIntervalo(
  escalasQuartel: Array<{ equipe: string; dataInicio: string | Date; dataFim: string | Date }>,
  equipe: string,
  periodoInicio: Date,
  periodoFim: Date
): number {
  let total = 0;
  for (const escala of escalasQuartel) {
    if (escala.equipe !== equipe) continue;
    const escInicio = new Date(escala.dataInicio);
    const escFim = new Date(escala.dataFim);
    // Interseccão entre o período do vínculo e o período da escala
    const inicio = escInicio > periodoInicio ? escInicio : periodoInicio;
    const fim = escFim < periodoFim ? escFim : periodoFim;
    if (inicio <= fim) {
      // Contar dias no intervalo (inclusive)
      const diffMs = fim.getTime() - inicio.getTime();
      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      total += dias;
    }
  }
  return total;
}

export async function calcularSaldoFMO(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false };

  // Buscar bombeiro
  const bombeiroRows = await db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.id, bombeiroId), eq(bombeiros.quartelId, quartelId)))
    .limit(1);

  const bombeiro = bombeiroRows[0];
  if (!bombeiro) return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false };

  // Verificar se o bombeiro é elegível (não é Administrativo)
  // Verifica equipe atual - se for Administrativo sem histórico, não é elegível
  const historico = await db
    .select()
    .from(bombeiroProntidaoHistorico)
    .where(and(eq(bombeiroProntidaoHistorico.bombeiroId, bombeiroId), eq(bombeiroProntidaoHistorico.quartelId, quartelId)))
    .orderBy(bombeiroProntidaoHistorico.dataInicio);

  // Buscar todas as escalas do quartel
  const todasEscalas = await db
    .select()
    .from(escalas)
    .where(eq(escalas.quartelId, quartelId));

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  let totalDiasServico = 0;

  if (historico.length > 0) {
    // Usar histórico de vínculos
    for (const vinculo of historico) {
      if (vinculo.equipe === "Administrativo") continue; // Pular períodos administrativos
      const inicio = new Date(vinculo.dataInicio);
      const fim = vinculo.dataFim ? new Date(vinculo.dataFim) : hoje;
      totalDiasServico += contarDiasEscalaNoIntervalo(todasEscalas as any, vinculo.equipe, inicio, fim);
    }
  } else {
    // Sem histórico: usar equipe atual desde dataInicio do bombeiro
    if (bombeiro.equipe === "Administrativo") {
      return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false };
    }
    const inicio = new Date(bombeiro.dataInicio);
    totalDiasServico = contarDiasEscalaNoIntervalo(todasEscalas as any, bombeiro.equipe, inicio, hoje);
  }

  const totalFMOGeradas = Math.floor(totalDiasServico / 2);

  // FMO usadas = afastamentos do tipo "dispensa"
  const fmoUsadasRows = await db
    .select()
    .from(afastamentos)
    .where(
      and(
        eq(afastamentos.bombeiroId, bombeiroId),
        eq(afastamentos.quartelId, quartelId),
        eq(afastamentos.tipo, "dispensa")
      )
    );

  const saldoFMO = totalFMOGeradas - fmoUsadasRows.length;

  return {
    totalDiasServico,
    totalFMOGeradas,
    fmoUsadas: fmoUsadasRows.length,
    saldoFMO: Math.max(0, saldoFMO),
    elegivel: true,
  };
}

// Manter alias para compatibilidade
export const calcularSaldoFO = calcularSaldoFMO;