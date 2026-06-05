// packages/database/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding flour mill demo data...");

  // ── Organisation ──────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "demo-company" },
    update: { name: "Demo Flour Mills", plan: "STARTER" },
    create: {
      name: "Demo Flour Mills",
      slug: "demo-company",
      plan: "STARTER",
      settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
        waPhoneId: "",
        emailDomain: "demoflour.com",
      },
    },
  });

  // ── Users ─────────────────────────────────────────────────
  const hash = await bcrypt.hash("Demo@1234", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: { email: "owner@demo.com", name: "Demo Owner", passwordHash: hash, role: "OWNER", phone: "919876543210", organizationId: org.id },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", name: "Amit Verma", passwordHash: hash, role: "ADMIN", phone: "919876543211", organizationId: org.id },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: { email: "manager@demo.com", name: "Raj Sharma", passwordHash: hash, role: "MANAGER", phone: "919876543212", organizationId: org.id },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: { email: "employee@demo.com", name: "Priya Patel", passwordHash: hash, role: "EMPLOYEE", phone: "919876543213", organizationId: org.id },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@demo.com" },
    update: {},
    create: { email: "employee2@demo.com", name: "Suresh Kumar", passwordHash: hash, role: "EMPLOYEE", phone: "919876543214", organizationId: org.id },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@demo.com" },
    update: {},
    create: { email: "vendor@demo.com", name: "Sehore Wheat Traders", passwordHash: hash, role: "VENDOR", phone: "919876543215", organizationId: org.id },
  });

  console.log("✅ Users created");

  // ── Clean existing data ───────────────────────────────────
  await Promise.all([
    prisma.marketRate.deleteMany({ where: { organizationId: org.id } }),
    prisma.order.deleteMany({ where: { organizationId: org.id } }),
    prisma.task.deleteMany({ where: { organizationId: org.id } }),
    prisma.report.deleteMany({ where: { organizationId: org.id } }),
    prisma.lead.deleteMany({ where: { organizationId: org.id } }),
    prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } }),
    prisma.automation.deleteMany({ where: { organizationId: org.id } }),
  ]);

  // ── Date helpers ──────────────────────────────────────────
  const today      = new Date();
  const yesterday  = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow   = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);
  const threeDaysLater = new Date(today); threeDaysLater.setDate(today.getDate() + 3);

  // ── Leads (flour mill customers) ─────────────────────────
  await prisma.lead.createMany({
    data: [
      { name: "Ratan Bakery", phone: "917554201001", email: "purchase@ratanbakery.com", company: "Ratan Bakery & Confectionery, Bhopal", status: "PROPOSAL", source: "referral", tags: ["bakery", "maida", "priority"], value: 180000, organizationId: org.id, followUpAt: today },
      { name: "Om Sweets & Namkeen", phone: "917554201002", email: "om@omsweets.com", company: "Om Sweets, Sehore", status: "NEGOTIATION", source: "whatsapp", tags: ["sweet-shop", "bulk", "vip"], value: 220000, organizationId: org.id, followUpAt: today },
      { name: "Jain Wholesale Traders", phone: "917554201003", email: "jain@jainwholesale.com", company: "Jain Wholesale, Vidisha", status: "QUALIFIED", source: "referral", tags: ["distributor", "large-volume"], value: 380000, organizationId: org.id },
      { name: "Hotel Palash Residency", phone: "917554201004", email: "kitchen@palashhotel.com", company: "Hotel Palash Residency, Bhopal", status: "CONTACTED", source: "manual", tags: ["hotel", "premium", "monthly"], value: 55000, organizationId: org.id },
      { name: "MP Civil Supplies Corp", phone: "917554201005", email: "tender@mpcssc.gov.in", company: "MP State Civil Supplies, Bhopal", status: "NEW", source: "manual", tags: ["government", "tender", "high-value"], value: 1200000, organizationId: org.id },
      { name: "Krishna Namkeen Factory", phone: "917554201006", email: "krishna@namkeen.com", company: "Krishna Namkeen, Bhopal", status: "CLOSED_WON", source: "whatsapp", tags: ["namkeen", "regular"], value: 95000, organizationId: org.id },
      { name: "Indore Bread House", phone: "917554201007", email: "purchase@indobread.com", company: "Indore Bread House, Indore", status: "CONTACTED", source: "website", tags: ["bakery", "indore", "maida"], value: 150000, organizationId: org.id },
      { name: "Star Banquet & Hotel", phone: "917554201008", email: "purchase@starbanquet.com", company: "Star Banquet Hall, Sehore", status: "QUALIFIED", source: "referral", tags: ["banquet", "bulk", "atta-maida"], value: 85000, organizationId: org.id },
      { name: "Gupta Kirana Wholesale", phone: "917554201009", email: "gupta@guptakirana.com", company: "Gupta Kirana Wholesale, Raisen", status: "NEW", source: "manual", tags: ["retail", "distributor"], value: 120000, organizationId: org.id },
      { name: "Sagar Restaurant Chain", phone: "917554201010", email: "sagar@sagarrestaurant.com", company: "Sagar Restaurant, Bhopal (3 outlets)", status: "PROPOSAL", source: "whatsapp", tags: ["restaurant", "monthly", "atta"], value: 65000, organizationId: org.id, followUpAt: tomorrow },
    ],
  });

  console.log("✅ 10 leads created (flour mill customers)");

  // ── Tasks ─────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { title: "Procure wheat from Sehore Mandi before prices rise further", description: "Wheat rates at Sehore are ₹24.20/kg today. Agent forecasts ₹25+ next week. Need to book 500 quintals urgently.", status: "PENDING", priority: "URGENT", dueAt: threeDaysAgo, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Maida stock critically low — restart production run", description: "Only 320 kg maida left. Om Sweets order for 800 kg due tomorrow. Production must start today.", status: "IN_PROGRESS", priority: "URGENT", dueAt: twoDaysAgo, organizationId: org.id, assigneeId: admin.id, createdById: owner.id },
      { title: "Close Om Sweets deal — ₹2.2L/month contract", description: "They want 5% discount on maida for 6-month commitment. Owner needs to take final call.", status: "PENDING", priority: "HIGH", dueAt: yesterday, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Deliver pending order to Ratan Bakery — 500 kg maida", description: "Order placed 2 days ago. Bakery called this morning — they are out of stock and urgent.", status: "PENDING", priority: "HIGH", dueAt: yesterday, organizationId: org.id, assigneeId: employee.id, createdById: manager.id },
      { title: "Roller Mill #2 maintenance — monthly scheduled service", description: "Last service was 38 days ago. Vibration noticed in morning shift. Engineer appointment at 3 PM.", status: "PENDING", priority: "MEDIUM", dueAt: today, organizationId: org.id, assigneeId: employee2.id, createdById: admin.id },
      { title: "Submit revised price list to all distributors", description: "Wheat cost increased 6% — need to revise selling price of atta and maida accordingly.", status: "PENDING", priority: "MEDIUM", dueAt: tomorrow, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Follow up with MP Civil Supplies tender application", description: "Submitted tender 10 days ago. ₹12 lakh order if approved. Check status with MPCSSC office.", status: "PENDING", priority: "HIGH", dueAt: tomorrow, organizationId: org.id, assigneeId: admin.id, createdById: owner.id },
      { title: "Warehouse stock audit — physical count vs system", description: "Monthly reconciliation due. Last audit found 4% discrepancy in rawa stock.", status: "PENDING", priority: "LOW", dueAt: threeDaysLater, organizationId: org.id, assigneeId: employee2.id, createdById: admin.id },
    ],
  });

  console.log("✅ 8 tasks created (4 overdue)");

  // ── Inventory (flour mill products) ──────────────────────
  await prisma.inventoryItem.createMany({
    data: [
      // Raw Material
      { name: "Wheat — Sehore/MP Sharbati (Raw Material)", sku: "WT-RAW-001", quantity: 28500, unit: "kg", minThreshold: 10000, costPrice: 24.20, sellingPrice: null, category: "Raw Material", organizationId: org.id },

      // Finished Products
      { name: "Chakki Atta (Whole Wheat Flour)", sku: "CA-001", quantity: 4800, unit: "kg", minThreshold: 1000, costPrice: 28, sellingPrice: 33, category: "Atta", organizationId: org.id },
      { name: "Maida (Refined Flour)", sku: "MA-001", quantity: 320, unit: "kg", minThreshold: 500, costPrice: 25, sellingPrice: 30, category: "Maida", organizationId: org.id },
      { name: "Rawa / Suji Fine", sku: "RS-F-001", quantity: 680, unit: "kg", minThreshold: 300, costPrice: 30, sellingPrice: 38, category: "Rawa", organizationId: org.id },
      { name: "Rawa / Suji Coarse (Daalia)", sku: "RS-C-001", quantity: 420, unit: "kg", minThreshold: 200, costPrice: 28, sellingPrice: 35, category: "Rawa", organizationId: org.id },
      { name: "Daliya (Broken Wheat)", sku: "DA-001", quantity: 890, unit: "kg", minThreshold: 200, costPrice: 22, sellingPrice: 28, category: "Daliya", organizationId: org.id },
      { name: "Wheat Bran (Chokar / Chikki)", sku: "BR-001", quantity: 3200, unit: "kg", minThreshold: 500, costPrice: 12, sellingPrice: 18, category: "Byproduct", organizationId: org.id },
      { name: "Sharbati Premium Atta (Fine Grind)", sku: "SA-001", quantity: 180, unit: "kg", minThreshold: 300, costPrice: 32, sellingPrice: 42, category: "Atta", organizationId: org.id },
      { name: "Multigrain Atta (Wheat + Jowar + Bajra)", sku: "MG-001", quantity: 95, unit: "kg", minThreshold: 200, costPrice: 36, sellingPrice: 48, category: "Atta", organizationId: org.id },
      { name: "Besan Grade Mix (Wheat-Gram Blend)", sku: "BG-001", quantity: 540, unit: "kg", minThreshold: 150, costPrice: 42, sellingPrice: 55, category: "Mixed", organizationId: org.id },
    ],
  });

  console.log("✅ 10 inventory items created (Maida, Sharbati Atta, Multigrain critically low)");

  // ── Market Rates ──────────────────────────────────────────
  // Wheat purchase rates from mandis + product selling rates
  const rateTime = new Date();

  await prisma.marketRate.createMany({
    data: [
      // ── Wheat purchase rates from nearby mandis ──
      { item: "Wheat (Sharbati)", rate: 24.20, unit: "kg", source: "Sehore Krishi Upaj Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 25.80, unit: "kg", source: "Bhopal Karond Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 23.90, unit: "kg", source: "Vidisha Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 23.50, unit: "kg", source: "Hoshangabad (Narmadapuram) Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 24.60, unit: "kg", source: "Ujjain Mandi (Malwa Belt)", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 23.30, unit: "kg", source: "Shajapur Mandi (Malwa Belt)", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Sharbati)", rate: 24.00, unit: "kg", source: "Raisen Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Desi/Local)", rate: 22.10, unit: "kg", source: "Sehore Krishi Upaj Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Desi/Local)", rate: 21.80, unit: "kg", source: "Vidisha Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat (Desi/Local)", rate: 22.40, unit: "kg", source: "Indore Mandi (Malwa Belt)", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },

      // ── Atta selling rates (market/competitors) ──
      { item: "Chakki Atta (Wholesale)", rate: 31.50, unit: "kg", source: "Bhopal Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Chakki Atta (Wholesale)", rate: 30.00, unit: "kg", source: "Sehore Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Chakki Atta (Wholesale)", rate: 32.50, unit: "kg", source: "Indore Wholesale Market", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },

      // ── Maida selling rates ──
      { item: "Maida (Wholesale)", rate: 29.00, unit: "kg", source: "Bhopal Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Maida (Wholesale)", rate: 27.50, unit: "kg", source: "Sehore Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Maida (Wholesale)", rate: 30.00, unit: "kg", source: "Indore Wholesale Market", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },

      // ── Rawa/Suji selling rates ──
      { item: "Rawa / Suji (Wholesale)", rate: 36.00, unit: "kg", source: "Bhopal Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Rawa / Suji (Wholesale)", rate: 34.50, unit: "kg", source: "Sehore Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },

      // ── Daliya selling rates ──
      { item: "Daliya (Wholesale)", rate: 27.00, unit: "kg", source: "Bhopal Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Daliya (Wholesale)", rate: 25.50, unit: "kg", source: "Sehore Market Rate", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
    ],
  });

  console.log("✅ 20 market rates added (wheat from 7 mandis + product rates)");

  // ── Orders ────────────────────────────────────────────────
  await prisma.order.createMany({
    data: [
      {
        orderNumber: "ORD-FM-089",
        status: "PENDING",
        items: [{ name: "Maida", qty: 500, unit: "kg", price: 30 }, { name: "Rawa Fine", qty: 200, unit: "kg", price: 38 }],
        subtotal: 22600, tax: 1130, totalAmount: 23730,
        notes: "Ratan Bakery — urgent, needed by 5 PM today",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-FM-090",
        status: "PROCESSING",
        items: [{ name: "Maida", qty: 800, unit: "kg", price: 30 }, { name: "Rawa Fine", qty: 300, unit: "kg", price: 38 }],
        subtotal: 35400, tax: 1770, totalAmount: 37170,
        notes: "Om Sweets monthly order — maida + rawa",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 5 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-FM-091",
        status: "CONFIRMED",
        items: [{ name: "Chakki Atta", qty: 1000, unit: "kg", price: 33 }, { name: "Sharbati Atta", qty: 200, unit: "kg", price: 42 }],
        subtotal: 41400, tax: 2070, totalAmount: 43470,
        notes: "Jain Wholesale Traders — first bulk order",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-FM-088",
        status: "DELIVERED",
        items: [{ name: "Daliya", qty: 500, unit: "kg", price: 28 }, { name: "Wheat Bran", qty: 300, unit: "kg", price: 18 }],
        subtotal: 19400, tax: 970, totalAmount: 20370,
        notes: "Krishna Namkeen — regular weekly order delivered",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 7 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ 4 orders created (₹1,24,740 today's revenue)");

  // ── Reports ───────────────────────────────────────────────
  const reportDate = new Date();
  reportDate.setHours(9, 30, 0, 0);

  await prisma.report.createMany({
    data: [
      {
        type: "DAILY_WORK",
        data: { summary: "Collected payment ₹37,170 from Om Sweets. Visited Ratan Bakery and Hotel Palash. Confirmed 2 new orders.", visitCount: 4, collectionAmount: 37170 },
        submittedById: admin.id,
        organizationId: org.id,
        date: reportDate,
        source: "APP",
      },
      {
        type: "VENDOR_RATE",
        data: { items: ["Wheat Sharbati @ ₹24.20/kg from Sehore Mandi", "Wheat Desi @ ₹22.10/kg"], supplier: "Sehore Wheat Traders", notes: "Rates expected to rise next week due to low arrivals" },
        submittedById: vendor.id,
        organizationId: org.id,
        date: reportDate,
        source: "APP",
      },
    ],
  });

  console.log("✅ Reports: 2 submitted | Raj Sharma, Priya Patel, Suresh Kumar have NOT submitted");

  // ── Automations ───────────────────────────────────────────
  await prisma.automation.createMany({
    data: [
      {
        name: "Daily report reminder at 6 PM",
        description: "Send WhatsApp reminder to staff who haven't submitted daily report by 6 PM",
        active: true,
        trigger: { event: "REPORT_MISSING", conditions: [{ field: "hour", operator: "gte", value: 18 }] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Namaskar {{name}} ji, kripya aaj ka daily report submit karein. Reply karein: Aaj ka kaam: [aapka summary]" } }],
        organizationId: org.id,
      },
      {
        name: "Low stock alert to mill manager",
        description: "Alert manager instantly when any product falls below minimum stock",
        active: true,
        trigger: { event: "STOCK_LOW", conditions: [] },
        actions: [{ type: "NOTIFY_MANAGER", params: { message: "⚠️ STOCK ALERT: {{itemName}} critically low — {{quantity}} kg remaining (minimum: {{threshold}} kg). Production or procurement needed immediately." } }],
        organizationId: org.id,
      },
      {
        name: "New customer welcome message",
        description: "Send welcome WhatsApp when new lead/customer is added",
        active: true,
        trigger: { event: "LEAD_CREATED", conditions: [] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Namaskar {{name}} ji! Demo Flour Mills mein aapka swagat hai. Hamari team 2 ghante mein aapko contact karegi. 🙏" } }],
        organizationId: org.id,
      },
      {
        name: "Payment overdue reminder",
        description: "Remind customers about overdue payments after 7 days",
        active: true,
        trigger: { event: "PAYMENT_OVERDUE", conditions: [{ field: "days_overdue", operator: "gte", value: 7 }] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "{{name}} ji, aapka ₹{{amount}} ka payment 7 din se overdue hai. Kripya jald se jald settle karein warna orders hold ho sakte hain." } }],
        organizationId: org.id,
      },
    ],
  });

  console.log("✅ 4 automations created");

  console.log("\n🎉 Flour Mill demo data seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login: owner@demo.com / Demo@1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 DEMO SUMMARY:");
  console.log("• Products: Atta, Maida, Rawa, Daliya, Bran, Sharbati Atta, Multigrain");
  console.log("• Wheat rates from 7 mandis: Sehore, Bhopal, Vidisha, Hoshangabad, Ujjain, Shajapur, Raisen");
  console.log("• 3 staff have NOT submitted reports (Raj, Priya, Suresh)");
  console.log("• Maida critically low (320kg — below 500kg minimum)");
  console.log("• Sharbati Atta low (180kg — below 300kg minimum)");
  console.log("• Multigrain Atta low (95kg — below 200kg minimum)");
  console.log("• 4 overdue tasks including ₹2.2L Om Sweets deal");
  console.log("• Today revenue: ₹1,24,740");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
