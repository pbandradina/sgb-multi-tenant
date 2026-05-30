import { and, eq, gte, lte, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

// Definições de tipo para evitar erros de compilação
type InsertUser = typeof schema.users.$inferInsert;
type InsertBombeiro = typeof schema.bombeiros.$inferInsert;
type InsertEscala = typeof schema.escalas.$inferInsert;
type InsertAfastamento = typeof schema.afastamentos.$inferInsert;
type InsertTroca = typeof schema.trocasServico.$inferInsert;

let _db: any = null;

/**
 * Inicializa e retorna a instância do banco de dados.
 */
export async function getDb() {
  if (!_db && typeof process !== 'undefined' && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { max: 1 });
      _db = drizzle(client, { schema });
    } catch (error) {
      console.warn("[Database] Falha ao conectar:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── UTILS DE DATA (PADRÃO YYYY-MM-DD PARA GEMINI/MYSQL) ─────────────────────

function dateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateLocal(str: string | Date): Date {
  if (str instanceof Date) return new Date(str.getFullYear(), str.getMonth(), str.getDate());
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── FUNÇÕES DE ESCALA (INTEGRAÇÃO COM AI STUDIO) ────────────────────────────

export async function createEscala(data: InsertEscala) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.insert(schema.escalas).values(data);
}

export async function getEscalasByQuartel(quartelId: number, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(schema.escalas.quartelId, quartelId)];
  if (dataInicio) conditions.push(sql`${schema.escalas.data} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${schema.escalas.data} <= ${dataFim}`);
  return db.select().from(schema.escalas).where(and(...conditions)).orderBy(schema.escalas.data);
}

// ─── AFASTAMENTOS ─────────────────────────────────────────────────────────────

export async function createAfastamento(data: InsertAfastamento) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.insert(schema.afastamentos).values(data);
}

// ─── CÁLCULO DE FMO (FOLGAS MENSAIS OBRIGATÓRIAS) ────────────────────────────

const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'TAF']);
const PAUSE_SIGLAS = new Set(['PA', 'FMO', 'FO', 'AG', 'ME', 'EX', 'VD', 'AM', 'AZ', 'EAP']);
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];
const CYCLE_REF_DATE = new Date(2026, 0, 1); // 01/Jan/2026 = Verde

function getProntidaoDoDia(date: Date) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const ref = new Date(CYCLE_REF_DATE.getFullYear(), CYCLE_REF_DATE.getMonth(), CYCLE_REF_DATE.getDate()).getTime();
  const diffDays = Math.round((target - ref) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

export async function calcularSaldoFMO(bombeiroId: number, quartelId: number) {
  const db = await getDb();
  if (!db) return null;

  const [bombeiro] = await db.select().from(schema.bombeiros).where(and(eq(schema.bombeiros.id, bombeiroId), eq(schema.bombeiros.quartelId, quartelId))).limit(1);
  if (!bombeiro || bombeiro.equipe === "Administrativo") return { totalFMOGeradas: 0, saldoFMO: 0, elegivel: false };

  const afasts = await db.select().from(schema.afastamentos).where(and(eq(schema.afastamentos.bombeiroId, bombeiroId), eq(schema.afastamentos.quartelId, quartelId)));
  const trocasE = await db.select().from(schema.trocasServico).where(and(eq(schema.trocasServico.bombeiroEntraId, bombeiroId), eq(schema.trocasServico.quartelId, quartelId)));
  const trocasS = await db.select().from(schema.trocasServico).where(and(eq(schema.trocasServico.bombeireSaiId, bombeiroId), eq(schema.trocasServico.quartelId, quartelId)));

  const diasCedidos = new Set(trocasS.map((t: any) => t.dataTroca));
  const diasExtras = new Set(trocasE.map((t: any) => t.dataTroca));
  const mapaAfast = new Map();

  afasts.forEach((af: any) => {
    let d = parseDateLocal(af.dataInicio);
    const fim = parseDateLocal(af.dataFim);
    while (d <= fim) {
      mapaAfast.set(dateToYMD(d), af.tipo);
      d.setDate(d.getDate() + 1);
    }
  });

  const hoje = new Date();
  const diasServico: Date[] = [];
  const dataInicioCalc = parseDateLocal(bombeiro.dataInicio);

  for (let d = new Date(dataInicioCalc); d <= hoje; d.setDate(d.getDate() + 1)) {
    const ymd = dateToYMD(d);
    if (diasCedidos.has(ymd)) continue;
    if (bombeiro.equipe === getProntidaoDoDia(d) || diasExtras.has(ymd)) {
      diasServico.push(new Date(d));
    }
  }

  let fmoGeradas = 0, ciclo = 0;
  diasServico.forEach(dt => {
    const sigla = mapaAfast.get(dateToYMD(dt));
    if (sigla && INTERRUPT_SIGLAS.has(sigla)) ciclo = 0;
    else if (!(sigla && PAUSE_SIGLAS.has(sigla))) {
      ciclo++;
      if (ciclo >= 9) { fmoGeradas++; ciclo = 0; }
    }
  });

  const fmoUsadasCount = afasts.filter((a: any) => a.tipo === "FMO").length;
  return {
    totalFMOGeradas: fmoGeradas,
    fmoUsadas: fmoUsadasCount,
    saldoFMO: Math.max(0, fmoGeradas - fmoUsadasCount),
    saldoCicloAtual: ciclo,
    elegivel: true
  };
}

// ─── BOMBEIROS ────────────────────────────────────────────────────────────────

export async function getBombeirosByQuartel(quartelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.bombeiros)
    .where(and(eq(schema.bombeiros.quartelId, quartelId), eq(schema.bombeiros.ativo, true)))
    .orderBy(schema.bombeiros.equipe, schema.bombeiros.nome);
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
export const calcularSaldoFO = calcularSaldoFMO;