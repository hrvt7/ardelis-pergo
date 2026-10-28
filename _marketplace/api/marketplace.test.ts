import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./router";
import { getDb } from "./queries/connection";
import { getCommissionSettings } from "./queries/marketplace";
import { commissions, leadEvents, leadOffers, leads, partners, users, type User } from "@db/schema";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const userIds: number[] = [];
const leadIds: number[] = [];

function caller(user?: User) {
  return appRouter.createCaller({
    req: new Request("http://localhost/api/trpc"),
    resHeaders: new Headers(),
    user,
  });
}

async function makeUser(role: "user" | "admin", name: string) {
  const [{ id }] = await getDb().insert(users).values({
    unionId: `test-${suffix}-${name}`,
    name,
    email: `${name}-${suffix}@example.test`,
    role,
  }).$returningId();
  userIds.push(id);
  return (await getDb().query.users.findFirst({
    where: (table, { eq: equals }) => equals(table.id, id),
  }))!;
}

async function makePartner(
  user: User,
  trades: ("pergola" | "fence")[],
) {
  const [{ id }] = await getDb().insert(partners).values({
    userId: user.id,
    companyName: `Teszt ${user.name}`,
    contactName: user.name ?? "Teszt",
    email: user.email!,
    phone: "+36301234567",
    headquarters: "Sárvár",
    baseCounty: "Vas",
    counties: ["Vas"],
    trades,
    status: "approved",
  }).$returningId();
  return id;
}

const leadInput = {
  productFamily: "pergola" as const,
  config: { width: 5, depth: 4, roof: "louvered" },
  estimateNet: 2_000_000,
  estimateGross: 2_540_000,
  customerName: "Érzékeny Ügyfél",
  email: "ugyfel@example.test",
  phone: "+36309998877",
  postalCode: "9600",
  city: "Sárvár",
  county: "Vas" as const,
  address: "Titok utca 12.",
  notes: "Tesztprojekt",
  consent: true as const,
  website: "",
};

afterAll(async () => {
  const db = getDb();
  try {
    if (leadIds.length) {
      await db.delete(commissions).where(inArray(commissions.leadId, leadIds));
      await db.delete(leadEvents).where(inArray(leadEvents.leadId, leadIds));
      await db.delete(leadOffers).where(inArray(leadOffers.leadId, leadIds));
      await db.delete(leads).where(inArray(leads.id, leadIds));
    }
    if (userIds.length) {
      await db.delete(partners).where(inArray(partners.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
  } finally {
    await db.$client.end();
  }
});

describe.sequential("ARDELIS marketplace integration", () => {
  it("enforces county/trade dispatch, anonymous offers, atomic first claim and commission", async () => {
    const firstUser = await makeUser("user", "first");
    const secondUser = await makeUser("user", "second");
    const otherUser = await makeUser("user", "other");
    const adminUser = await makeUser("admin", "admin");
    const firstPartner = await makePartner(firstUser, ["pergola"]);
    const secondPartner = await makePartner(secondUser, ["pergola"]);
    const otherPartner = await makePartner(otherUser, ["fence"]);

    const created = await caller().lead.create(leadInput);
    expect(created.offersCreated).toBeGreaterThanOrEqual(2);
    expect(created.publicRef).toMatch(/^AR-\d{4}-/);
    const lead = await getDb().query.leads.findFirst({
      where: (table, { eq: equals }) => equals(table.publicRef, created.publicRef),
    });
    expect(lead?.status).toBe("offered");
    leadIds.push(lead!.id);

    const testOffers = await getDb().select().from(leadOffers).where(and(
      eq(leadOffers.leadId, lead!.id),
      inArray(leadOffers.partnerId, [firstPartner, secondPartner, otherPartner]),
    ));
    expect(testOffers.map((offer) => offer.partnerId).sort()).toEqual(
      [firstPartner, secondPartner].sort(),
    );
    expect(testOffers.every((offer) => offer.status === "offered")).toBe(true);

    const firstAvailable = await caller(firstUser).partner.available();
    const anonymous = firstAvailable.find((item) => item.leadId === lead!.id);
    expect(anonymous).toBeDefined();
    expect(anonymous).not.toHaveProperty("customerName");
    expect(anonymous).not.toHaveProperty("email");
    expect(anonymous).not.toHaveProperty("phone");
    expect(anonymous).not.toHaveProperty("address");
    const otherAvailable = await caller(otherUser).partner.available();
    expect(otherAvailable.some((item) => item.leadId === lead!.id)).toBe(false);

    const claims = await Promise.allSettled([
      caller(firstUser).partner.claim({ leadId: lead!.id }),
      caller(secondUser).partner.claim({ leadId: lead!.id }),
    ]);
    expect(claims.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(claims.filter((result) => result.status === "rejected")).toHaveLength(1);

    const firstWon = claims[0].status === "fulfilled";
    const winner = firstWon ? firstUser : secondUser;
    const loser = firstWon ? secondUser : firstUser;
    const winnerPartner = firstWon ? firstPartner : secondPartner;
    const winnerJobs = await caller(winner).partner.jobs();
    const wonJob = winnerJobs.find((item) => item.id === lead!.id);
    expect(wonJob?.customerName).toBe(leadInput.customerName);
    expect(wonJob?.address).toBe(leadInput.address);
    const loserJobs = await caller(loser).partner.jobs();
    expect(loserJobs.some((item) => item.id === lead!.id)).toBe(false);
    const loserAvailable = await caller(loser).partner.available();
    expect(loserAvailable.some((item) => item.leadId === lead!.id)).toBe(false);

    await caller(winner).partner.updateJob({
      leadId: lead!.id,
      status: "won",
      actualNet: 1_000_000,
      actualGross: 1_270_000,
      note: "Integrációs teszt",
    });
    const settingsBeforeCompletion = await getCommissionSettings();
    await caller(adminUser).admin.completeLead({
      leadId: lead!.id,
      actualNet: 1_000_000,
      actualGross: 1_270_000,
    });
    const baseAmount = settingsBeforeCompletion.commissionBasis === "net" ? 1_000_000 : 1_270_000;
    const expectedAmount = Math.round(baseAmount * settingsBeforeCompletion.commissionRateBp / 10_000);
    const admin = await caller(adminUser).admin.overview();
    const commission = admin.commissions.find((item) => item.leadId === lead!.id);
    expect(commission?.partnerId).toBe(winnerPartner);
    expect(commission?.amount).toBe(expectedAmount);
    expect(commission?.status).toBe("due");

    const tracked = await caller().lead.track({
      publicRef: created.publicRef,
      email: leadInput.email,
    });
    expect(tracked?.status).toBe("completed");
    expect(tracked).not.toHaveProperty("phone");
    expect(tracked).not.toHaveProperty("address");
    await expect(caller(winner).admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  }, 30_000);
});
