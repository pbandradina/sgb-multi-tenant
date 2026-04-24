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
  const result = await db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.quartelId, quartelId), eq(bombeiros.ativo, true)))
    .orderBy(bombeiros.equipe, bombeiros.nome);
  return result;
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
  // NÃO usar fixDateString: o driver mysql2 salva strings "YYYY-MM-DD" corretamente sem +1 dia
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

export async function getAfastamentosByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(afastamentos.quartelId, quartelId)];
  if (dataInicio) conditions.push(sql`${afastamentos.dataFim} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${afastamentos.dataInicio} <= ${dataFim}`);
  return db
    .select({ afastamento: afastamentos, bombeiro: bombeiros })
    .from(afastamentos)
    .innerJoin(bombeiros, eq(afastamentos.bombeiroId, bombeiros.id))
    .where(and(...conditions))
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
  // NÃO usar fixDateString aqui: o driver mysql2 salva strings "YYYY-MM-DD" corretamente
  // fixDateString adicionava +1 dia causando bug: clicar no dia 19 salvava como dia 20
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
  // NÃO usar fixDateString: o driver mysql2 salva strings "YYYY-MM-DD" corretamente sem +1 dia
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
// Regra: a cada 9 dias de serviço CONSECUTIVOS o bombeiro tem direito a 1 FMO.
// A sequência é INTERROMPIDA (zerada) quando um afastamento de código interruptor
// cai em um dia de serviço do bombeiro.
// Códigos interruptores: F, LP, DS, LT, D, LTS, C, CFS, CAS, EAP, TAF
// O cálculo usa o CICLO FIXO de prontídões (Verde→Amarela→Azul, começando 01/Jan/2025=Verde)
// cruzado com o histórico de vínculos do bombeiro.
// Bombeiros da equipe Administrativo não entram no cálculo.

// Siglas que interrompem a sequência de serviços consecutivos
const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'EAP', 'TAF']);

// Ciclo contínuo: referência 01/Jan/2026 = Verde (idx=0)
// Verde → Amarela → Azul → Verde → ... (1 dia cada, sem reiniciar no ano)
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"] as const;
const CYCLE_REFERENCE_SERVER_MS = new Date(2026, 0, 1).getTime(); // 01/Jan/2026 = Verde

function getProntidaoDoDiaServer(date: Date): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_SERVER_MS) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

/**
 * Conta quantos dias do ciclo fixo de uma prontidão específica caem dentro de um intervalo de datas.
 */
function contarDiasCicloNoIntervalo(equipe: string, periodoInicio: Date, periodoFim: Date): number {
  let total = 0;
  const inicio = new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), periodoInicio.getDate());
  const fim = new Date(periodoFim.getFullYear(), periodoFim.getMonth(), periodoFim.getDate());
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (getProntidaoDoDiaServer(d) === equipe) total++;
  }
  return total;
}

// Formata data como DD/MM/YYYY sem conversão de timezone
const MESES_ABREV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function formatDateBR(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const mes = MESES_ABREV[date.getMonth()];
  return `${d}${mes}`;
}

// Corrige o offset de timezone do MySQL: adiciona 1 dia à string YYYY-MM-DD
// O driver mysql2 converte DATE para Date UTC, causando perda de 1 dia em GMT-3
export function fixDateString(dateStr: string | null | undefined): string | null | undefined {
  if (!dateStr) return dateStr;
  // Recebe "YYYY-MM-DD", adiciona 1 dia para compensar a conversão UTC do driver
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + 1); // +1 dia
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Parse de string "YYYY-MM-DD" para Date sem conversão de timezone
export function parseDateLocal(str: string | Date): Date {
  if (str instanceof Date) {
    return new Date(str.getFullYear(), str.getMonth(), str.getDate());
  }
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Converte Date para string "YYYY-MM-DD" sem conversão de timezone
function dateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function calcularSaldoFMO(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false, periodosConcessao: [], saldoCicloAtual: 0 };

  // Buscar bombeiro
  const bombeiroRows = await db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.id, bombeiroId), eq(bombeiros.quartelId, quartelId)))
    .limit(1);

  const bombeiro = bombeiroRows[0];
  if (!bombeiro) return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false, periodosConcessao: [], saldoCicloAtual: 0 };

  // Bombeiro Administrativo não tem FMO
  if (bombeiro.equipe === "Administrativo") {
    return { totalDiasServico: 0, totalFMOGeradas: 0, fmoUsadas: 0, saldoFMO: 0, elegivel: false, periodosConcessao: [], saldoCicloAtual: 0 };
  }

  // Buscar histórico de vínculos
  const historico = await db
    .select()
    .from(bombeiroProntidaoHistorico)
    .where(and(eq(bombeiroProntidaoHistorico.bombeiroId, bombeiroId), eq(bombeiroProntidaoHistorico.quartelId, quartelId)))
    .orderBy(bombeiroProntidaoHistorico.dataInicio);

  // Buscar todos os afastamentos do bombeiro para verificar interrupções
  const todosAfastamentos = await db
    .select()
    .from(afastamentos)
    .where(and(eq(afastamentos.bombeiroId, bombeiroId), eq(afastamentos.quartelId, quartelId)))
    .orderBy(afastamentos.dataInicio);

  // Construir mapa de data → sigla de afastamento para consulta rápida
  const afastamentoNoDia = new Map<string, string>();
  for (const af of todosAfastamentos) {
    const inicio = parseDateLocal(af.dataInicio as any);
    const fim = parseDateLocal(af.dataFim as any);
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const chave = dateToYMD(d);
      // Prioriza afastamentos interruptores
      if (!afastamentoNoDia.has(chave) || INTERRUPT_SIGLAS.has(af.tipo)) {
        afastamentoNoDia.set(chave, af.tipo);
      }
    }
  }

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  // Construir lista de dias de serviço com informação de equipe vigente
  // Cada entrada: { data: Date, equipe: string }
  const diasDeServico: Array<{ data: Date; equipe: string }> = [];

  if (historico.length > 0) {
    for (const vinculo of historico) {
      if (vinculo.equipe === "Administrativo") continue;
      const inicio = parseDateLocal(vinculo.dataInicio as any);
      const fim = vinculo.dataFim ? parseDateLocal(vinculo.dataFim as any) : hoje;
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        if (getProntidaoDoDiaServer(d) === vinculo.equipe) {
          diasDeServico.push({ data: new Date(d), equipe: vinculo.equipe });
        }
      }
    }
  } else {
    const inicio = parseDateLocal(bombeiro.dataInicio as any);
    for (let d = new Date(inicio); d <= hoje; d.setDate(d.getDate() + 1)) {
      if (getProntidaoDoDiaServer(d) === bombeiro.equipe) {
        diasDeServico.push({ data: new Date(d), equipe: bombeiro.equipe });
      }
    }
  }

  // Calcular FMO com lógica de interrupção por afastamentos
  // A cada 9 serviços CONSECUTIVOS (sem interrupção) = 1 FMO
  let fmoGeradas = 0;
  let cicloAtual = 0;
  let dataInicioConquista: Date | null = null;
  const periodosConcessao: Array<{ numero: number; dataInicio: string; dataFim: string; label: string }> = [];

  for (const { data, equipe: _equipe } of diasDeServico) {
    const chave = dateToYMD(data);
    const siglaAfastamento = afastamentoNoDia.get(chave);

    if (siglaAfastamento && INTERRUPT_SIGLAS.has(siglaAfastamento)) {
      // Afastamento interruptor: zerar a sequência
      cicloAtual = 0;
      dataInicioConquista = null;
    } else if (siglaAfastamento === 'FMO') {
      // FMO usada: não interrompe nem conta como serviço
      // (apenas registra o uso, não afeta a sequência)
    } else {
      // Dia de serviço válido (sem afastamento interruptor)
      if (cicloAtual === 0) dataInicioConquista = data;
      cicloAtual++;
      if (cicloAtual >= 9) {
        fmoGeradas++;
        periodosConcessao.push({
          numero: fmoGeradas,
          dataInicio: formatDateBR(dataInicioConquista!),
          dataFim: formatDateBR(data),
          label: `FMO #${fmoGeradas}: ${formatDateBR(dataInicioConquista!)} a ${formatDateBR(data)}`,
        });
        cicloAtual = 0;
        dataInicioConquista = null;
      }
    }
  }

  const totalDiasServico = diasDeServico.length;

  // FMO usadas (afastamentos do tipo FMO)
  const fmoUsadasRows = await db
    .select()
    .from(afastamentos)
    .where(
      and(
        eq(afastamentos.bombeiroId, bombeiroId),
        eq(afastamentos.quartelId, quartelId),
        eq(afastamentos.tipo, "FMO")
      )
    );

  const saldoFMO = fmoGeradas - fmoUsadasRows.length;

  return {
    totalDiasServico,
    totalFMOGeradas: fmoGeradas,
    fmoUsadas: fmoUsadasRows.length,
    saldoFMO: Math.max(0, saldoFMO),
    elegivel: true,
    periodosConcessao,
    saldoCicloAtual: cicloAtual,
  };
}

// Manter alias para compatibilidade
export const calcularSaldoFO = calcularSaldoFMO;