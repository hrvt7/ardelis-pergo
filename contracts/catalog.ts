export const PRODUCT_FAMILIES = ["pergola", "canopy", "carport", "fence", "gate"] as const;
export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];

export const PRODUCT_LABELS: Record<ProductFamily, string> = {
  pergola: "Pergo · pergola",
  canopy: "Cover · előtető",
  carport: "Drive · autóbeálló",
  fence: "Fence · kerítés",
  gate: "Gate · kapu",
};

export const SERVICE_REGIONS = [
  "Budapest",
  "Baranya",
  "Bács-Kiskun",
  "Békés",
  "Borsod-Abaúj-Zemplén",
  "Csongrád-Csanád",
  "Fejér",
  "Győr-Moson-Sopron",
  "Hajdú-Bihar",
  "Heves",
  "Jász-Nagykun-Szolnok",
  "Komárom-Esztergom",
  "Nógrád",
  "Pest",
  "Somogy",
  "Szabolcs-Szatmár-Bereg",
  "Tolna",
  "Vas",
  "Veszprém",
  "Zala",
] as const;

export const LEAD_STATUSES = [
  "submitted",
  "offered",
  "accepted",
  "surveyed",
  "quoted",
  "won",
  "completed",
  "cancelled",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  submitted: "Kiosztásra vár",
  offered: "Partnereknél",
  accepted: "Partner elfogadta",
  surveyed: "Felmérve",
  quoted: "Árajánlat adva",
  won: "Megrendelve",
  completed: "Megvalósult",
  cancelled: "Lezárva / megszakadt",
};
