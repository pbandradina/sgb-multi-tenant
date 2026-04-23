import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAfastamentosByQuartel,
  getAfastamentosByBombeiro,
  getAfastamentosAtivos,
  createAfastamento,
  deleteAfastamento,
  getUserQuartelRole,
  getBombeirosByQuartel,
  calcularSaldoFO,
} from "../db";

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

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      bombeiroId: z.number(),
      tipo: z.enum(["ferias", "licenca_medica", "dispensa", "outros"]),
      dataInicio: z.string(),
      dataFim: z.string(),
      descricao: z.string().optional(),
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
});

export const foRouter = router({
  // Saldo de FO de um bombeiro específico
  saldoBombeiro: protectedProcedure
    .input(z.object({ bombeiroId: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return calcularSaldoFO(input.bombeiroId, input.quartelId);
    }),

  // Saldo de FO de todos os bombeiros do quartel
  saldoQuartel: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const bombeiros = await getBombeirosByQuartel(input.quartelId);
      const saldos = await Promise.all(
        bombeiros.map(async (b) => ({
          bombeiro: b,
          saldo: await calcularSaldoFO(b.id, input.quartelId),
        }))
      );
      return saldos;
    }),

  // Relatório de FO por período e equipe
  relatorio: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      dataInicio: z.string(),
      dataFim: z.string(),
      equipe: z.enum(["VD", "VA", "VB", "VC"]).optional(),
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
          saldo: await calcularSaldoFO(b.id, input.quartelId),
        }))
      );
      return relatorio;
    }),
});
