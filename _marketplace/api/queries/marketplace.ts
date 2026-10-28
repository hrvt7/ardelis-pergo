import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./connection";
import { leadOffers, leads, partners, platformSettings } from "@db/schema";

export async function getPartnerForUser(userId: number) {
  return getDb().query.partners.findFirst({ where: eq(partners.userId, userId) });
}

export async function getCommissionSettings() {
  const existing = await getDb().query.platformSettings.findFirst({
    where: eq(platformSettings.settingKey, "global"),
  });
  return existing ?? {
    id: 0,
    settingKey: "global",
    commissionRateBp: 800,
    commissionBasis: "net" as const,
    updatedAt: new Date(0),
  };
}

export async function dispatchLeadToEligiblePartners(leadId: number) {
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead || !["submitted", "offered"].includes(lead.status)) return 0;

  const [approved, existingOffers] = await Promise.all([
    db.select().from(partners).where(eq(partners.status, "approved")),
    db.select().from(leadOffers).where(eq(leadOffers.leadId, leadId)),
  ]);
  const alreadyOffered = new Set(existingOffers.map((offer) => offer.partnerId));
  const eligible = approved.filter((partner) =>
    !alreadyOffered.has(partner.id) &&
    partner.counties.includes(lead.county) &&
    partner.trades.includes(lead.productFamily),
  );

  if (eligible.length) {
    await db.insert(leadOffers).values(eligible.map((partner) => ({
      leadId,
      partnerId: partner.id,
      status: "offered" as const,
    })));
  }
  if (eligible.length || existingOffers.some((offer) => offer.status === "offered")) {
    await db.update(leads).set({ status: "offered" }).where(
      and(eq(leads.id, leadId), inArray(leads.status, ["submitted", "offered"])),
    );
  }
  return eligible.length;
}

export async function dispatchWaitingLeadsForPartner(partnerId: number) {
  const db = getDb();
  const partner = await db.query.partners.findFirst({ where: eq(partners.id, partnerId) });
  if (!partner || partner.status !== "approved") return 0;
  const waiting = await db.select().from(leads).where(inArray(leads.status, ["submitted", "offered"]));
  const matching = waiting.filter((lead) =>
    partner.counties.includes(lead.county) && partner.trades.includes(lead.productFamily),
  );
  let created = 0;
  for (const lead of matching) created += await dispatchLeadToEligiblePartners(lead.id);
  return created;
}
