import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const adminRouter = router({
  // Listar todos os usuários (apenas admin global)
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem listar usuários" });
    }
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).orderBy(users.createdAt);
  }),

  // Promover usuário a admin global
  promoverAdmin: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem promover usuários" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Rebaixar admin para usuário comum
  rebaixarAdmin: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem rebaixar usuários" });
      }
      if (ctx.user.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode rebaixar a si mesmo" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: "user" }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
