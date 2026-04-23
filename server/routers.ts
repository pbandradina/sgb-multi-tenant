import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { quartelRouter } from "./routers/quartel";
import { bombeiroRouter } from "./routers/bombeiro";
import { escalaRouter } from "./routers/escala";
import { prontidaoRouter } from "./routers/prontidao";
import { afastamentoRouter, foRouter } from "./routers/afastamento";
import { adminRouter } from "./routers/admin";
import { historicoRouter } from "./routers/historico";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  quartel: quartelRouter,
  bombeiro: bombeiroRouter,
  escala: escalaRouter,
  prontidao: prontidaoRouter,
  afastamento: afastamentoRouter,
  fo: foRouter,
  admin: adminRouter,
  historico: historicoRouter,
});

export type AppRouter = typeof appRouter;
