import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { dispatchLeadToEligiblePartners } from "./queries/marketplace";
import { leadEvents, leads } from "@db/schema";
import { PRODUCT_FAMILIES, SERVICE_REGIONS } from "@contracts/catalog";

const configuration = z.record(z.string(), z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 20000,
  "A konfiguráció túl nagy.",
);

const leadInput = z.object({
  productFamily: z.enum(PRODUCT_FAMILIES),
  config: configuration,
  estimateNet: z.number().int().nonnegative().max(500000000),
  estimateGross: z.number().int().nonnegative().max(500000000),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(40),
  postalCode: z.string().trim().min(4).max(12),
  city: z.string().trim().min(2).max(120),
  county: z.enum(SERVICE_REGIONS),
  address: z.string().trim().max(220).optional(),
  notes: z.string().trim().max(2000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

export const leadRouter = createRouter({
  create: publicQuery.input(leadInput).mutation(async ({ input }) => {
    const db = getDb();
    const publicRef = `AR-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const [{ id }] = await db.insert(leads).values({
      publicRef,
      productFamily: input.productFamily,
      configJson: JSON.stringify(input.config),
      estimateNet: input.estimateNet,
      estimateGross: input.estimateGross,
      customerName: input.customerName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      postalCode: input.postalCode,
      city: input.city,
      county: input.county,
      address: input.address || null,
      notes: input.notes || null,
      consentAt: new Date(),
    }).$returningId();
    await db.insert(leadEvents).values({
      leadId: id,
      event: "lead_created",
      toStatus: "submitted",
      note: "Ügyfél hozzájárulásával rögzített konfiguráció.",
    });
    const offersCreated = await dispatchLeadToEligiblePartners(id);
    return { publicRef, offersCreated };
  }),

  track: publicQuery.input(z.object({
    publicRef: z.string().trim().min(8).max(32),
    email: z.string().trim().email().max(320),
  })).query(async ({ input }) => {
    const lead = await getDb().query.leads.findFirst({
      where: and(eq(leads.publicRef, input.publicRef), eq(leads.email, input.email.toLowerCase())),
    });
    if (!lead) return null;
    return {
      publicRef: lead.publicRef,
      productFamily: lead.productFamily,
      status: lead.status,
      county: lead.county,
      city: lead.city,
      createdAt: lead.createdAt,
    };
  }),
});
