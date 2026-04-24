import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getBombeirosByQuartel,
  getBombeiroById,
  createBombeiro,
  updateBombeiro,
  deleteBombeiro,
  getUserQuartelRole,
} from "../db";

async function assertQuartelAccess(userId: number, quartelId: number) {
  const rel = await getUserQuartelRole(userId, quartelId);
  if (!rel) throw new TRPCError({ code: "FORBIDDEN", message: "Sem acesso a este quartel" });
  return rel;
}

export const bombeiroRouter = router({
  list: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      return getBombeirosByQuartel(input.quartelId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const bombeiro = await getBombeiroById(input.id, input.quartelId);
      if (!bombeiro) throw new TRPCError({ code: "NOT_FOUND" });
      return bombeiro;
    }),

  create: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      nome: z.string().min(3),
      nomeGuerra: z.string().optional(),
      posto: z.string().min(2),
      equipe: z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]),
      dataInicio: z.string(), // YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await createBombeiro({
        quartelId: input.quartelId,
        nome: input.nome,
        nomeGuerra: input.nomeGuerra ?? null,
        posto: input.posto,
        equipe: input.equipe,
        dataInicio: input.dataInicio as any,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      quartelId: z.number(),
      nome: z.string().min(3).optional(),
      nomeGuerra: z.string().optional().nullable(),
      posto: z.string().min(2).optional(),
      equipe: z.enum(["Prontidão Verde", "Prontidão Azul", "Prontidão Amarela", "Administrativo"]).optional(),
      dataInicio: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      const { id, quartelId, ...data } = input;
      const updateData: Parameters<typeof updateBombeiro>[2] = {
        ...data,
        ...(data.dataInicio ? { dataInicio: data.dataInicio as any } : {}),
      };
      await updateBombeiro(id, quartelId, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") await assertQuartelAccess(ctx.user.id, input.quartelId);
      await deleteBombeiro(input.id, input.quartelId);
      return { success: true };
    }),
});
