import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAfastamentosByQuartel,
  getAfastamentosByBombeiro,
  getAfastamentosAtivos,
  createAfastamento,
  deleteAfastamento,
  updateAfastamento,
  getUserQuartelRole,
  getBombeirosByQuartel,
  calcularSaldoFMO,
} from "../db";

// Siglas de afastamentos conforme sistema anterior
// EX (Expediente) removido — é tipo de escala semanal, não afastamento
export const TIPOS_AFASTAMENTO = [
  "F", "LP", "LT", "DS", "FMO", "PA", "D", "C", "LTS", "CFS", "CAS", "EAP", "TAF", "ME", "AG"
] as const;

export type TipoAfastamento = typeof TIPOS_AFASTAMENTO[number];

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

export const afastamentoRouter = router({
  listByQuartel: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getAfastamentosByQuartel(input.quartelId);
    }),

  listByBombeiro: protectedProcedure
    .input(z.object({ bombeiroId: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getAfastamentosByBombeiro(input.bombeiroId, input.quartelId);
    }),

  listAtivos: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const hoje = new Date().toISOString().split("T")[0];
      return getAfastamentosAtivos(input.quartelId, hoje);
    }),

  // Buscar afastamentos por mês para exibir no calendário
  listByMes: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      ano: z.number(),
      mes: z.number(), // 1-12
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const dataInicio = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
      const ultimoDia = new Date(input.ano, input.mes, 0).getDate();
      const dataFim = `${input.ano}-${String(input.mes).padStart(2, "0")}-${ultimoDia}`;
      return getAfastamentosByQuartel(input.quartelId, dataInicio, dataFim);
    }),

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      bombeiroId: z.number(),
      tipo: z.enum(TIPOS_AFASTAMENTO),
      dataInicio: z.string(),
      dataFim: z.string(),
      descricao: z.string().optional(),
      periodoConcessao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await createAfastamento({
        quartelId: input.quartelId,
        bombeiroId: input.bombeiroId,
        tipo: input.tipo,
        dataInicio: input.dataInicio as any,
        dataFim: input.dataFim as any,
        descricao: input.descricao,
        periodoConcessao: input.periodoConcessao,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await deleteAfastamento(input.id, input.quartelId);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      quartelId: z.number(),
      tipo: z.enum(TIPOS_AFASTAMENTO),
      dataInicio: z.string(),
      dataFim: z.string(),
      descricao: z.string().optional(),
      periodoConcessao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      if (input.dataFim < input.dataInicio) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Data de fim não pode ser anterior à data de início" });
      }
      await updateAfastamento(input.id, input.quartelId, {
        tipo: input.tipo,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        descricao: input.descricao,
        periodoConcessao: input.periodoConcessao,
      });
      return { success: true };
    }),
});

export const foRouter = router({
  // Saldo de FMO de um bombeiro específico
  saldoBombeiro: protectedProcedure
    .input(z.object({ bombeiroId: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return calcularSaldoFMO(input.bombeiroId, input.quartelId);
    }),

  // Saldo de FMO de todos os bombeiros do quartel
  saldoQuartel: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const bombeiros = await getBombeirosByQuartel(input.quartelId);
      const saldos = await Promise.all(
        bombeiros.map(async (b) => ({
          bombeiro: b,
          saldo: await calcularSaldoFMO(b.id, input.quartelId),
        }))
      );
      return saldos;
    }),

  // Relatório de FMO por período e equipe
  relatorio: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      dataInicio: z.string(),
      dataFim: z.string(),
      equipe: z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      let bombeiros = await getBombeirosByQuartel(input.quartelId);
      if (input.equipe) {
        bombeiros = bombeiros.filter(b => b.equipe === input.equipe);
      }
      const relatorio = await Promise.all(
        bombeiros.map(async (b) => ({
          bombeiro: b,
          saldo: await calcularSaldoFMO(b.id, input.quartelId),
        }))
      );
      return relatorio;
    }),
});
