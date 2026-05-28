import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { quartelRouter } from "./routers/quartel.js";
import { bombeiroRouter } from "./routers/bombeiro.js";
import { escalaRouter } from "./routers/escala.js";
import { prontidaoRouter } from "./routers/prontidao.js";
import { afastamentoRouter, foRouter } from "./routers/afastamento.js";
import { adminRouter } from "./routers/admin.js";
import { historicoRouter } from "./routers/historico.js";
import { trocaRouter } from "./routers/troca.js";
import { updateRouter } from "./routers/update.js";

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
  troca: trocaRouter,
  update: updateRouter,
});

export type AppRouter = typeof appRouter;
