import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { 
  createEscala, 
  deleteEscala, 
  getEscalas 
} from "../db";

export const escalaRouter = router({
  list: publicProcedure.query(async () => {
    return await getEscalas();
  }),

  create: publicProcedure
    .input(z.any()) // Idealmente use seu schema do zod aqui
    .mutation(async ({ input }) => {
      return await createEscala(input);
    }),

  delete: publicProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return await deleteEscala(input);
    }),
});