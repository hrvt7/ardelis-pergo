import { adminRouter } from "./admin-router";
import { authRouter } from "./auth-router";
import { leadRouter } from "./lead-router";
import { createRouter, publicQuery } from "./middleware";
import { partnerRouter } from "./partner-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  lead: leadRouter,
  partner: partnerRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
