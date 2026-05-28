import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import {
  getEscalasByQuartel,
  createEscala,
  deleteEscala,
  getUserQuartelRole,
} from "../db.js";

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

export const escalaRouter = router({
  list: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getEscalasByQuartel(input.quartelId, input.dataInicio, input.dataFim);
    }),

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      equipe: z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]),
      dataInicio: z.string(),
      dataFim: z.string(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await createEscala({
        quartelId: input.quartelId,
        equipe: input.equipe,
        dataInicio: input.dataInicio as any,
        dataFim: input.dataFim as any,
        observacao: input.observacao,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await deleteEscala(input.id, input.quartelId);
      return { success: true };
    }),
});
