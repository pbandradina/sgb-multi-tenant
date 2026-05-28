import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import {
  getTrocasByQuartel,
  createTroca,
  deleteTroca,
  updateTroca,
  getUserQuartelRole,
} from "../db.js";

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

export const trocaRouter = router({
  /** Lista trocas de um quartel em um mês/ano */
  list: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      ano: z.number(),
      mes: z.number(), // 0-indexed (0=Jan)
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getTrocasByQuartel(input.quartelId, input.ano, input.mes);
    }),

  /** Cria uma nova troca de serviço */
  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      bombeiroEntraId: z.number(),
      bombeireSaiId: z.number(),
      dataTroca: z.string(), // YYYY-MM-DD
      dataPagamento: z.string().optional(),
      numeroSEI: z.string().optional(),
      numeroParte: z.string().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return createTroca(input);
    }),

  /** Atualiza uma troca de serviço */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      quartelId: z.number(),
      bombeiroEntraId: z.number().optional(),
      bombeireSaiId: z.number().optional(),
      dataTroca: z.string().optional(),
      dataPagamento: z.string().nullable().optional(),
      numeroSEI: z.string().nullable().optional(),
      numeroParte: z.string().nullable().optional(),
      observacao: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const { id, quartelId, ...fields } = input;
      return updateTroca(id, quartelId, fields);
    }),

  /** Remove uma troca de serviço */
  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return deleteTroca(input.id, input.quartelId);
    }),
});
