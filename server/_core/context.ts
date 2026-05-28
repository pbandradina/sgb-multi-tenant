import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "../../drizzle/schema.js";
import { sdk } from "./sdk.js";

type User = InferSelectModel<typeof users>;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // Log the error for debugging
    console.error("[Context] Auth error (optional):", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}