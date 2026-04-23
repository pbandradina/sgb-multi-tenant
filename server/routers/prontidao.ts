import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getProntidoesByBombeiro,
  getProntidoesByQuartel,
  createProntidao,
  deleteProntidao,
  getUserQuartelRole,
} from "../db";

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

export const prontidaoRouter = router({
  listByBombeiro: protectedProcedure
    .input(z.object({ bombeiroId: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getProntidoesByBombeiro(input.bombeiroId, input.quartelId);
    }),

  listByQuartel: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getProntidoesByQuartel(input.quartelId, input.dataInicio, input.dataFim);
    }),

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      bombeiroId: z.number(),
      data: z.string(),
      equipe: z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await createProntidao({
        quartelId: input.quartelId,
        bombeiroId: input.bombeiroId,
        data: input.data as any,
        equipe: input.equipe,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await deleteProntidao(input.id, input.quartelId);
      return { success: true };
    }),
});
