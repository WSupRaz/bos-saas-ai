// apps/web/services/reply-parser.ts
import { type ReportType } from "@prisma/client";

interface ParsedReport {
  type: ReportType;
  data: Record<string, unknown>;
}

type PatternDef = {
  regex: RegExp;
  type: ReportType;
  extract: (match: RegExpMatchArray) => Record<string, unknown>;
};

const PATTERNS: PatternDef[] = [
  // "Stock: 200 kg" or "stock 200"
  {
    regex: /stock[:\s]+(\d+\.?\d*)\s*(kg|bags?|liter|units?|pcs?)?/i,
    type: "STOCK_UPDATE",
    extract: (m) => ({ quantity: parseFloat(m[1]), unit: m[2] ?? "units" }),
  },
  // "Rate: 3100" or "rate 3100 per kg"
  {
    regex: /rate[:\s]+(\d+\.?\d*)\s*(?:per\s*(\w+))?/i,
    type: "VENDOR_RATE",
    extract: (m) => ({ rate: parseFloat(m[1]), unit: m[2] ?? "unit" }),
  },
  // "Work done: Delivered 40 bags to Rajkot" or "Work: ..."
  {
    regex: /(?:work\s*done|work\s*report|work)[:\s]+(.+)/i,
    type: "DAILY_WORK",
    extract: (m) => ({ summary: m[1].trim() }),
  },
  // "Delivered: Delivered 40 bags"
  {
    regex: /delivered[:\s]+(.+)/i,
    type: "DAILY_WORK",
    extract: (m) => ({ summary: `Delivered: ${m[1].trim()}` }),
  },
  // "Sales: 250 bags" or "sales 250"
  {
    regex: /sales[:\s]+(\d+\.?\d*)\s*(kg|bags?|units?)?/i,
    type: "DISTRIBUTOR_SALES",
    extract: (m) => ({ sales: parseFloat(m[1]), unit: m[2] ?? "units" }),
  },
  // "Expense: 5000 petrol"
  {
    regex: /expense[:\s]+(\d+\.?\d*)\s*(.*)/i,
    type: "EXPENSE",
    extract: (m) => ({ amount: parseFloat(m[1]), description: m[2]?.trim() }),
  },
];

export function parseWhatsAppReply(text: string): ParsedReport | null {
  const normalized = text.trim();
  for (const { regex, type, extract } of PATTERNS) {
    const match = normalized.match(regex);
    if (match) {
      return { type, data: extract(match) };
    }
  }
  return null;
}

/** Determine the user who sent the message by their phone number */
export async function findUserByPhone(
  phone: string,
  orgId: string,
  prisma: import("@prisma/client").PrismaClient
): Promise<string | null> {
  // Normalize: strip + and spaces, try both with and without country code
  const clean = phone.replace(/\D/g, "");
  const user = await prisma.user.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ phone: clean }, { phone: `+${clean}` }],
    },
    select: { id: true },
  });
  return user?.id ?? null;
}
