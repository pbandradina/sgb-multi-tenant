import { describe, it, expect, vi } from 'vitest';
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Utilitário para gerar um mock de Resposta que satisfaz o TypeScript Estrito.
 * O 'as unknown as' é necessário para simular um objeto complexo do Express.
 */
function createMockRes() {
  return {
    clearCookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as TrpcContext["res"];
}

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: createMockRes(),
    }
  };
}

function createUserContext(id = 2): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: createMockRes(),
    }
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).not.toBeNull();
    expect(me?.role).toBe("admin");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: createMockRes(),
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

describe("quartel.listAll - access control", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.quartel.listAll()).rejects.toThrow();
  });
});

describe("quartel.myQuarteis", () => {
  it("returns an array for authenticated users", async () => {
    const { ctx } = createUserContext(999);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.quartel.myQuarteis();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bombeiro router - access control", () => {
  it("throws UNAUTHORIZED for unauthenticated list request", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: createMockRes(),
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.bombeiro.list({ quartelId: 1 })).rejects.toThrow();
  });
});

describe("afastamento router - access control", () => {
  it("throws UNAUTHORIZED for unauthenticated list request", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: createMockRes(),
    };
    const caller = appRouter.createCaller(ctx);
    
    // Conforme logs anteriores, seu backend utiliza listByQuartel
    await expect(caller.afastamento.listByQuartel({ quartelId: 1 })).rejects.toThrow();
  });
});