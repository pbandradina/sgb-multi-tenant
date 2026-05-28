import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import {
  getAllQuarteis,
  getQuartelById,
  createQuartel,
  updateQuartel,
  deleteQuartel,
  getQuartelsByUserId,
  addUserToQuartel,
  getUsersByQuartelId,
  removeUserFromQuartel,
  getUserByOpenId,
} from "../db.js";

export const quartelRouter = router({
  // Listar todos os quarteis (admin global)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem listar todos os quarteis" });
    }
    return getAllQuarteis();
  }),

  // Listar quarteis do usuário logado
  myQuarteis: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") {
      return (await getAllQuarteis()).map(q => ({ quartel: q, role: "admin" as const }));
    }
    return getQuartelsByUserId(ctx.user.id);
  }),

  // Obter quartel por ID (com verificação de acesso)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const quartel = await getQuartelById(input.id);
      if (!quartel) throw new TRPCError({ code: "NOT_FOUND" });
      return quartel;
    }),

  // Criar quartel (admin global)
  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(3),
      sigla: z.string().min(2).max(20),
      cidade: z.string().optional(),
      estado: z.string().length(2).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await createQuartel(input);
      return result;
    }),

  // Atualizar quartel (admin global)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(3).optional(),
      sigla: z.string().min(2).max(20).optional(),
      cidade: z.string().optional(),
      estado: z.string().length(2).optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      await updateQuartel(id, data);
      return { success: true };
    }),

  // Deletar quartel (admin global)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteQuartel(input.id);
      return { success: true };
    }),

  // Listar usuários de um quartel
  listUsers: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getUsersByQuartelId(input.quartelId);
    }),

  // Adicionar usuário a quartel (admin global)
  addUser: protectedProcedure
    .input(z.object({
      quartelId: z.number(),
      openId: z.string(),
      role: z.enum(["admin", "operador"]).default("operador"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const user = await getUserByOpenId(input.openId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      await addUserToQuartel(input.quartelId, user.id, input.role);
      return { success: true };
    }),

  // Remover usuário de quartel (admin global)
  removeUser: protectedProcedure
    .input(z.object({ quartelId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await removeUserFromQuartel(input.userId, input.quartelId);
      return { success: true };
    }),

  // Auto-associar usuário ao seu quartel (após login)
  joinQuartel: protectedProcedure
    .input(z.object({ quartelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await addUserToQuartel(input.quartelId, ctx.user.id, "operador");
      return { success: true };
    }),
});
