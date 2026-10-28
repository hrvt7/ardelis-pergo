import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authedQuery, createRouter } from "./middleware";
import { getDb } from "./queries/connection";
import { getCommissionSettings, getPartnerForUser } from "./queries/marketplace";
import { commissions, leadEvents, leadOffers, leads, partners } from "@db/schema";
import { PRODUCT_FAMILIES, SERVICE_REGIONS } from "@contracts/catalog";

const partnerInput = z.object({
  companyName: z.string().trim().min(2).max(180),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(40),
  taxNumber: z.string().trim().max(32).optional(),
  website: z.union([z.literal(""), z.string().url().max(255)]).optional(),
  headquarters: z.string().trim().min(2).max(180),
  baseCounty: z.enum(SERVICE_REGIONS),
  counties: z.array(z.enum(SERVICE_REGIONS)).min(1).max(SERVICE_REGIONS.length),
  trades: z.array(z.enum(PRODUCT_FAMILIES)).min(1).max(PRODUCT_FAMILIES.length),
  introduction: z.string().trim().max(3000).optional(),
  consent: z.literal(true),
});

async function requireApprovedPartner(userId: number) {
  const partner = await getPartnerForUser(userId);
  if (!partner || partner.status !== "approved") {
    throw new TRPCError({ code: "FORBIDDEN", message: "A művelethez jóváhagyott partneri fiók szükséges." });
  }
  return partner;
}

export const partnerRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    const partner = await getPartnerForUser(ctx.user.id);
    const settings = await getCommissionSettings();
    return { partner, settings };
  }),

  register: authedQuery.input(partnerInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const values = {
      userId: ctx.user.id,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      taxNumber: input.taxNumber || null,
      website: input.website || null,
      headquarters: input.headquarters,
      baseCounty: input.baseCounty,
      counties: input.counties,
      trades: input.trades,
      introduction: input.introduction || null,
    };
    await db.insert(partners).values(values).onDuplicateKeyUpdate({
      set: {
        companyName: values.companyName,
        contactName: values.contactName,
        email: values.email,
        phone: values.phone,
        taxNumber: values.taxNumber,
        website: values.website,
        headquarters: values.headquarters,
        baseCounty: values.baseCounty,
        counties: values.counties,
        trades: values.trades,
        introduction: values.introduction,
      },
    });
    return getPartnerForUser(ctx.user.id);
  }),

  available: authedQuery.query(async ({ ctx }) => {
    const partner = await requireApprovedPartner(ctx.user.id);
    const rows = await getDb().select({
      offerId: leadOffers.id,
      offeredAt: leadOffers.offeredAt,
      leadId: leads.id,
      publicRef: leads.publicRef,
      productFamily: leads.productFamily,
      configJson: leads.configJson,
      estimateNet: leads.estimateNet,
      estimateGross: leads.estimateGross,
      county: leads.county,
      city: leads.city,
      postalCode: leads.postalCode,
      notes: leads.notes,
      createdAt: leads.createdAt,
    }).from(leadOffers).innerJoin(leads, eq(leadOffers.leadId, leads.id)).where(
      and(eq(leadOffers.partnerId, partner.id), eq(leadOffers.status, "offered"), eq(leads.status, "offered")),
    ).orderBy(desc(leadOffers.offeredAt));
    return rows;
  }),

  jobs: authedQuery.query(async ({ ctx }) => {
    const partner = await requireApprovedPartner(ctx.user.id);
    return getDb().select().from(leads).where(eq(leads.acceptedPartnerId, partner.id)).orderBy(desc(leads.updatedAt));
  }),

  claim: authedQuery.input(z.object({ leadId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const partner = await requireApprovedPartner(ctx.user.id);
    const db = getDb();
    return db.transaction(async (tx) => {
      const [offer] = await tx.select().from(leadOffers).where(
        and(eq(leadOffers.leadId, input.leadId), eq(leadOffers.partnerId, partner.id), eq(leadOffers.status, "offered")),
      ).limit(1);
      if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Ez a projektajánlat már nem érhető el." });

      const updateResult = await tx.update(leads).set({
        status: "accepted",
        acceptedPartnerId: partner.id,
        acceptedAt: new Date(),
      }).where(and(eq(leads.id, input.leadId), eq(leads.status, "offered"), isNull(leads.acceptedPartnerId)));
      const affectedRows = (updateResult[0] as { affectedRows?: number }).affectedRows ?? 0;
      if (affectedRows !== 1) {
        throw new TRPCError({ code: "CONFLICT", message: "Egy másik partner már elfogadta ezt a projektet." });
      }

      await tx.update(leadOffers).set({ status: "accepted", respondedAt: new Date() }).where(eq(leadOffers.id, offer.id));
      await tx.update(leadOffers).set({ status: "lost", respondedAt: new Date() }).where(
        and(eq(leadOffers.leadId, input.leadId), ne(leadOffers.partnerId, partner.id), eq(leadOffers.status, "offered")),
      );
      await tx.insert(leadEvents).values({
        leadId: input.leadId,
        actorUserId: ctx.user.id,
        event: "lead_claimed",
        fromStatus: "offered",
        toStatus: "accepted",
        note: `${partner.companyName} · atomikus első elfogadó kiosztás`,
      });
      return { ok: true, leadId: input.leadId };
    });
  }),

  updateJob: authedQuery.input(z.object({
    leadId: z.number().int().positive(),
    status: z.enum(["surveyed", "quoted", "won"]),
    actualNet: z.number().int().positive().max(500000000).optional(),
    actualGross: z.number().int().positive().max(500000000).optional(),
    note: z.string().trim().max(1000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const partner = await requireApprovedPartner(ctx.user.id);
    const db = getDb();
    return db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(
        and(eq(leads.id, input.leadId), eq(leads.acceptedPartnerId, partner.id)),
      ).limit(1);
      if (!lead || ["completed", "cancelled"].includes(lead.status)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "A munka nem módosítható." });
      }
      if (["quoted", "won"].includes(input.status) && (!input.actualNet || !input.actualGross)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Árajánlathoz és megrendeléshez nettó és bruttó munkaérték szükséges." });
      }
      await tx.update(leads).set({
        status: input.status,
        actualNet: input.actualNet ?? lead.actualNet,
        actualGross: input.actualGross ?? lead.actualGross,
      }).where(eq(leads.id, lead.id));
      await tx.insert(leadEvents).values({
        leadId: lead.id,
        actorUserId: ctx.user.id,
        event: "job_status_changed",
        fromStatus: lead.status,
        toStatus: input.status,
        note: input.note || null,
      });
      return { ok: true };
    });
  }),

  commissions: authedQuery.query(async ({ ctx }) => {
    const partner = await requireApprovedPartner(ctx.user.id);
    return getDb().select().from(commissions).where(eq(commissions.partnerId, partner.id)).orderBy(desc(commissions.createdAt));
  }),
});
