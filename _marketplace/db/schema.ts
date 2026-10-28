import {
  bigint,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const partners = mysqlTable("partners", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  contactName: varchar("contactName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  taxNumber: varchar("taxNumber", { length: 32 }),
  website: varchar("website", { length: 255 }),
  headquarters: varchar("headquarters", { length: 180 }).notNull(),
  baseCounty: varchar("baseCounty", { length: 60 }).notNull(),
  counties: json("counties").$type<string[]>().notNull(),
  trades: json("trades").$type<string[]>().notNull(),
  introduction: text("introduction"),
  status: mysqlEnum("status", ["pending", "approved", "suspended"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  userIdx: uniqueIndex("partner_user_unique").on(table.userId),
  coverageIdx: index("partner_coverage_idx").on(table.status, table.baseCounty),
}));

export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  publicRef: varchar("publicRef", { length: 32 }).notNull(),
  productFamily: mysqlEnum("productFamily", ["pergola", "canopy", "carport", "fence", "gate"]).notNull(),
  configJson: text("configJson").notNull(),
  estimateNet: int("estimateNet").notNull(),
  estimateGross: int("estimateGross").notNull(),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  postalCode: varchar("postalCode", { length: 12 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  county: varchar("county", { length: 60 }).notNull(),
  address: varchar("address", { length: 220 }),
  notes: text("notes"),
  consentAt: timestamp("consentAt").notNull(),
  status: mysqlEnum("status", ["submitted", "offered", "accepted", "surveyed", "quoted", "won", "completed", "cancelled"]).default("submitted").notNull(),
  acceptedPartnerId: bigint("acceptedPartnerId", { mode: "number", unsigned: true }).references(() => partners.id),
  acceptedAt: timestamp("acceptedAt"),
  actualNet: int("actualNet"),
  actualGross: int("actualGross"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  refIdx: uniqueIndex("lead_ref_unique").on(table.publicRef),
  dispatchIdx: index("lead_dispatch_idx").on(table.county, table.productFamily, table.status),
  partnerIdx: index("lead_partner_idx").on(table.acceptedPartnerId, table.status),
}));

export const leadOffers = mysqlTable("lead_offers", {
  id: serial("id").primaryKey(),
  leadId: bigint("leadId", { mode: "number", unsigned: true }).notNull().references(() => leads.id),
  partnerId: bigint("partnerId", { mode: "number", unsigned: true }).notNull().references(() => partners.id),
  status: mysqlEnum("status", ["offered", "accepted", "lost", "withdrawn"]).default("offered").notNull(),
  offeredAt: timestamp("offeredAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
}, (table) => ({
  leadPartnerIdx: uniqueIndex("offer_lead_partner_unique").on(table.leadId, table.partnerId),
  partnerStatusIdx: index("offer_partner_status_idx").on(table.partnerId, table.status),
  leadStatusIdx: index("offer_lead_status_idx").on(table.leadId, table.status),
}));

export const leadEvents = mysqlTable("lead_events", {
  id: serial("id").primaryKey(),
  leadId: bigint("leadId", { mode: "number", unsigned: true }).notNull().references(() => leads.id),
  actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }).references(() => users.id),
  event: varchar("event", { length: 80 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 24 }),
  toStatus: varchar("toStatus", { length: 24 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  leadTimeIdx: index("event_lead_time_idx").on(table.leadId, table.createdAt),
}));

export const platformSettings = mysqlTable("platform_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("settingKey", { length: 60 }).notNull(),
  commissionRateBp: int("commissionRateBp").default(800).notNull(),
  commissionBasis: mysqlEnum("commissionBasis", ["net", "gross"]).default("net").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  keyIdx: uniqueIndex("setting_key_unique").on(table.settingKey),
}));

export const commissions = mysqlTable("commissions", {
  id: serial("id").primaryKey(),
  leadId: bigint("leadId", { mode: "number", unsigned: true }).notNull().references(() => leads.id),
  partnerId: bigint("partnerId", { mode: "number", unsigned: true }).notNull().references(() => partners.id),
  basis: mysqlEnum("basis", ["net", "gross"]).notNull(),
  rateBp: int("rateBp").notNull(),
  baseAmount: int("baseAmount").notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["due", "invoiced", "settled"]).default("due").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  invoicedAt: timestamp("invoicedAt"),
  settledAt: timestamp("settledAt"),
}, (table) => ({
  leadIdx: uniqueIndex("commission_lead_unique").on(table.leadId),
  statusIdx: index("commission_status_idx").on(table.partnerId, table.status),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadOffer = typeof leadOffers.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
