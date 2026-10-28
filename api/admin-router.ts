import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { dispatchWaitingLeadsForPartner, getCommissionSettings } from "./queries/marketplace";
import { commissions, leadEvents, leadOffers, leads, partners, platformSettings } from "@db/schema";

export const adminRouter = createRouter({
  overview: adminQuery.query(async () => {
    const db = getDb();
    const [partnerRows, leadRows, commissionRows, settings] = await Promise.all([
      db.select().from(partners).orderBy(desc(partners.createdAt)),
      db.select().from(leads).orderBy(desc(leads.createdAt)),
      db.select().from(commissions).orderBy(desc(commissions.createdAt)),
      getCommissionSettings(),
    ]);
    return { partners: partnerRows, leads: leadRows, commissions: commissionRows, settings };
  }),

  setPartnerStatus: adminQuery.input(z.object({
    partnerId: z.number().int().positive(),
    status: z.enum(["pending", "approved", "suspended"]),
  })).mutation(async ({ input }) => {
    await getDb().update(partners).set({ status: input.status }).where(eq(partners.id, input.partnerId));
    const offersCreated = input.status === "approved" ? await dispatchWaitingLeadsForPartner(input.partnerId) : 0;
    return { ok: true, offersCreated };
  }),

  setCommissionSettings: adminQuery.input(z.object({
    commissionRateBp: z.number().int().min(0).max(5000),
    commissionBasis: z.enum(["net", "gross"]),
  })).mutation(async ({ input }) => {
    await getDb().insert(platformSettings).values({
      settingKey: "global",
      commissionRateBp: input.commissionRateBp,
      commissionBasis: input.commissionBasis,
    }).onDuplicateKeyUpdate({ set: input });
    return getCommissionSettings();
  }),

  completeLead: adminQuery.input(z.object({
    leadId: z.number().int().positive(),
    actualNet: z.number().int().positive().max(500000000),
    actualGross: z.number().int().positive().max(500000000),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const settings = await getCommissionSettings();
    return db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead?.acceptedPartnerId || ["submitted", "offered", "completed", "cancelled"].includes(lead.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A munka jelenlegi állapotában nem zárható le." });
      }
      const baseAmount = settings.commissionBasis === "net" ? input.actualNet : input.actualGross;
      const amount = Math.round(baseAmount * settings.commissionRateBp / 10000);
      await tx.update(leads).set({
        status: "completed",
        actualNet: input.actualNet,
        actualGross: input.actualGross,
        completedAt: new Date(),
      }).where(eq(leads.id, lead.id));
      await tx.insert(commissions).values({
        leadId: lead.id,
        partnerId: lead.acceptedPartnerId,
        basis: settings.commissionBasis,
        rateBp: settings.commissionRateBp,
        baseAmount,
        amount,
        status: "due",
      }).onDuplicateKeyUpdate({ set: {
        basis: settings.commissionBasis,
        rateBp: settings.commissionRateBp,
        baseAmount,
        amount,
      } });
      await tx.insert(leadEvents).values({
        leadId: lead.id,
        actorUserId: ctx.user.id,
        event: "job_completed",
        fromStatus: lead.status,
        toStatus: "completed",
        note: `Jutalékalap: ${baseAmount} Ft · kulcs: ${settings.commissionRateBp / 100}% · ${settings.commissionBasis}`,
      });
      return { ok: true, amount };
    });
  }),

  cancelLead: adminQuery.input(z.object({
    leadId: z.number().int().positive(),
    note: z.string().trim().min(3).max(1000),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead || lead.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "A munka nem vonható vissza." });
      await tx.update(leads).set({ status: "cancelled" }).where(eq(leads.id, lead.id));
      await tx.update(leadOffers).set({ status: "withdrawn", respondedAt: new Date() }).where(eq(leadOffers.leadId, lead.id));
      await tx.insert(leadEvents).values({
        leadId: lead.id,
        actorUserId: ctx.user.id,
        event: "lead_cancelled",
        fromStatus: lead.status,
        toStatus: "cancelled",
        note: input.note,
      });
      return { ok: true };
    });
  }),

  setCommissionStatus: adminQuery.input(z.object({
    commissionId: z.number().int().positive(),
    status: z.enum(["due", "invoiced", "settled"]),
  })).mutation(async ({ input }) => {
    await getDb().update(commissions).set({
      status: input.status,
      invoicedAt: input.status === "invoiced" ? new Date() : null,
      settledAt: input.status === "settled" ? new Date() : null,
    }).where(eq(commissions.id, input.commissionId));
    return { ok: true };
  }),

  leadEvents: adminQuery.input(z.object({ leadId: z.number().int().positive() })).query(async ({ input }) => {
    return getDb().select().from(leadEvents).where(eq(leadEvents.leadId, input.leadId)).orderBy(desc(leadEvents.createdAt));
  }),
});
