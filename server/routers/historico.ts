import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import {
  getHistoricoByBombeiro,
  getHistoricoByQuartel,
  createHistorico,
  deleteHistorico,
  getUserQuartelRole,
} from "../db.js";

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

const EQUIPE_ENUM = z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]);

export const historicoRouter = router({
  listByBombeiro: protectedProcedure
    .input(z.object({ bombeiroId: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getHistoricoByBombeiro(input.bombeiroId, input.quartelId);
    }),

  listByQuartel: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getHistoricoByQuartel(input.quartelId);
    }),

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      bombeiroId: z.number(),
      equipe: EQUIPE_ENUM,
      dataInicio: z.string(),
      dataFim: z.string().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await createHistorico({
        quartelId: input.quartelId,
        bombeiroId: input.bombeiroId,
        equipe: input.equipe,
        dataInicio: input.dataInicio as any,
        dataFim: input.dataFim as any ?? null,
        observacao: input.observacao,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await deleteHistorico(input.id, input.quartelId);
      return { success: true };
    }),
});
