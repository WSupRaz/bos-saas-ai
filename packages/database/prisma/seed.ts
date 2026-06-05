// packages/database/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with demo data...");

  // ── Organisation ──────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "demo-company" },
    update: { name: "Demo Company", plan: "STARTER" },
    create: {
      name: "Demo Company",
      slug: "demo-company",
      plan: "STARTER",
      settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
        waPhoneId: "",
        emailDomain: "democompany.com",
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
    create: { email: "vendor@demo.com", name: "Sharma Traders", passwordHash: hash, role: "VENDOR", phone: "919876543215", organizationId: org.id },
  });

  console.log("✅ Users created");

  // ── Clean up existing demo data ───────────────────────────
  await Promise.all([
    prisma.marketRate.deleteMany({ where: { organizationId: org.id } }),
    prisma.order.deleteMany({ where: { organizationId: org.id } }),
    prisma.task.deleteMany({ where: { organizationId: org.id } }),
    prisma.report.deleteMany({ where: { organizationId: org.id } }),
    prisma.lead.deleteMany({ where: { organizationId: org.id } }),
    prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } }),
  ]);

  // ── Leads ─────────────────────────────────────────────────
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);
  const threeDaysLater = new Date(today); threeDaysLater.setDate(today.getDate() + 3);

  await prisma.lead.createMany({
    data: [
      { name: "Vikram Mehta", phone: "919876540001", email: "vikram@mehtatraders.com", company: "Mehta Traders", status: "NEW", source: "whatsapp", tags: ["wholesale", "new"], value: 85000, organizationId: org.id },
      { name: "Sunita Rao", phone: "919876540002", email: "sunita@raodist.com", company: "Rao Distributors", status: "CONTACTED", source: "referral", tags: ["distributor", "south-india"], value: 220000, organizationId: org.id, followUpAt: today },
      { name: "Anil Kumar", phone: "919876540003", email: "anil@kumarent.com", company: "Kumar Enterprises", status: "QUALIFIED", source: "website", tags: ["retail", "monthly"], value: 45000, organizationId: org.id },
      { name: "Deepa Singh", phone: "919876540004", email: "deepa@singhsons.com", company: "Singh & Sons", status: "PROPOSAL", source: "manual", tags: ["vip", "bulk"], value: 380000, organizationId: org.id, followUpAt: today },
      { name: "Mohan Das", phone: "919876540005", company: "Das Trading Co", status: "CLOSED_WON", source: "whatsapp", tags: ["wholesale", "regular"], value: 95000, organizationId: org.id },
      { name: "Ramesh Gupta", phone: "919876540006", email: "ramesh@guptawholesale.com", company: "Gupta Wholesale", status: "NEGOTIATION", source: "referral", tags: ["large-account", "priority"], value: 520000, organizationId: org.id, followUpAt: today },
      { name: "Kavita Sharma", phone: "919876540007", email: "kavita@freshmart.com", company: "Fresh Mart Superstore", status: "QUALIFIED", source: "website", tags: ["retail-chain", "premium"], value: 180000, organizationId: org.id },
      { name: "Suresh Pillai", phone: "919876540008", email: "suresh@pillaifood.com", company: "Pillai Food Supplies", status: "CONTACTED", source: "manual", tags: ["distributor"], value: 150000, organizationId: org.id },
      { name: "Hotel Grand Plaza", phone: "919876540009", email: "purchase@grandplaza.com", company: "Hotel Grand Plaza", status: "PROPOSAL", source: "referral", tags: ["hotel", "premium", "bulk"], value: 650000, organizationId: org.id, followUpAt: tomorrow },
      { name: "Amit Joshi", phone: "919876540010", email: "amit@joshimart.com", company: "Joshi Mart Chain", status: "CLOSED_LOST", source: "website", tags: ["retail"], value: 60000, organizationId: org.id },
    ],
  });

  console.log("✅ 10 leads created");

  // ── Tasks ─────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { title: "Follow up with Ramesh Gupta — ₹5.2L deal closing", description: "He asked for revised pricing. Must call today or deal goes to competitor.", status: "PENDING", priority: "URGENT", dueAt: threeDaysAgo, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Restock Sugar — critically low (12 kg remaining)", description: "Current stock will last only 2 days at current consumption rate.", status: "PENDING", priority: "URGENT", dueAt: twoDaysAgo, organizationId: org.id, assigneeId: admin.id, createdById: owner.id },
      { title: "Prepare Q2 sales report for board meeting", description: "Board meeting scheduled for end of week. Need revenue, margins, and growth metrics.", status: "IN_PROGRESS", priority: "HIGH", dueAt: yesterday, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Send proposal to Hotel Grand Plaza", description: "They need custom pricing for bulk monthly orders. High value client.", status: "PENDING", priority: "HIGH", dueAt: today, organizationId: org.id, assigneeId: employee.id, createdById: manager.id },
      { title: "Collect payment from Mehta Traders (overdue 15 days)", description: "₹45,000 outstanding. Third reminder needed.", status: "PENDING", priority: "HIGH", dueAt: yesterday, organizationId: org.id, assigneeId: employee2.id, createdById: admin.id },
      { title: "Weekly team review meeting", description: "Review targets, pending tasks and address team issues.", status: "PENDING", priority: "MEDIUM", dueAt: tomorrow, organizationId: org.id, assigneeId: manager.id, createdById: owner.id },
      { title: "Negotiate new rates with Sharma Traders supplier", description: "Current rates increased by 8%. Need to renegotiate before next month.", status: "PENDING", priority: "MEDIUM", dueAt: threeDaysLater, organizationId: org.id, assigneeId: admin.id, createdById: owner.id },
      { title: "Audit warehouse inventory — physical count", description: "Monthly physical audit to match system records.", status: "PENDING", priority: "LOW", dueAt: threeDaysLater, organizationId: org.id, assigneeId: employee2.id, createdById: admin.id },
    ],
  });

  console.log("✅ 8 tasks created (4 overdue)");

  // ── Inventory ─────────────────────────────────────────────
  await prisma.inventoryItem.createMany({
    data: [
      { name: "Wheat Flour (Atta)", sku: "WF-001", quantity: 485, unit: "kg", minThreshold: 100, costPrice: 34, sellingPrice: 42, category: "Grains", organizationId: org.id },
      { name: "Basmati Rice Premium", sku: "BR-001", quantity: 38, unit: "kg", minThreshold: 50, costPrice: 82, sellingPrice: 105, category: "Grains", organizationId: org.id },
      { name: "Mustard Oil", sku: "MO-001", quantity: 210, unit: "liter", minThreshold: 40, costPrice: 138, sellingPrice: 165, category: "Oils", organizationId: org.id },
      { name: "Sugar", sku: "SU-001", quantity: 12, unit: "kg", minThreshold: 60, costPrice: 41, sellingPrice: 50, category: "Sweeteners", organizationId: org.id },
      { name: "Toor Dal", sku: "TD-001", quantity: 95, unit: "kg", minThreshold: 30, costPrice: 112, sellingPrice: 138, category: "Pulses", organizationId: org.id },
      { name: "Sunflower Oil", sku: "SO-001", quantity: 340, unit: "liter", minThreshold: 50, costPrice: 128, sellingPrice: 155, category: "Oils", organizationId: org.id },
      { name: "Maida (All Purpose Flour)", sku: "MA-001", quantity: 22, unit: "kg", minThreshold: 40, costPrice: 28, sellingPrice: 36, category: "Grains", organizationId: org.id },
      { name: "Chana Dal", sku: "CD-001", quantity: 180, unit: "kg", minThreshold: 40, costPrice: 88, sellingPrice: 108, category: "Pulses", organizationId: org.id },
      { name: "Turmeric Powder", sku: "TP-001", quantity: 6, unit: "kg", minThreshold: 10, costPrice: 180, sellingPrice: 240, category: "Spices", organizationId: org.id },
      { name: "Red Chilli Powder", sku: "RC-001", quantity: 45, unit: "kg", minThreshold: 20, costPrice: 195, sellingPrice: 260, category: "Spices", organizationId: org.id },
    ],
  });

  console.log("✅ 10 inventory items created (4 below minimum threshold)");

  // ── Market Rates (today's supplier rates) ─────────────────
  const rateTime = new Date();
  await prisma.marketRate.createMany({
    data: [
      { item: "Wheat", rate: 30, unit: "kg", source: "City Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat", rate: 32, unit: "kg", source: "Sharma Traders", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Wheat", rate: 35, unit: "kg", source: "Gupta Wholesale", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Sugar", rate: 41, unit: "kg", source: "City Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Sugar", rate: 44, unit: "kg", source: "Sweet Suppliers Co", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Sugar", rate: 39, unit: "kg", source: "National Sugar Mills", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Basmati Rice", rate: 78, unit: "kg", source: "Rice Mill Direct", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Basmati Rice", rate: 85, unit: "kg", source: "Premium Grains Co", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Mustard Oil", rate: 135, unit: "liter", source: "City Mandi", sourceType: "mandi", recordedAt: rateTime, organizationId: org.id },
      { item: "Mustard Oil", rate: 130, unit: "liter", source: "Agro Industries Ltd", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Toor Dal", rate: 108, unit: "kg", source: "Dal Wholesale Hub", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
      { item: "Toor Dal", rate: 115, unit: "kg", source: "Sharma Traders", sourceType: "supplier", recordedAt: rateTime, organizationId: org.id },
    ],
  });

  console.log("✅ 12 market rates submitted today");

  // ── Orders ────────────────────────────────────────────────
  await prisma.order.createMany({
    data: [
      {
        orderNumber: "ORD-2024-089",
        status: "PENDING",
        items: [{ name: "Wheat Flour", qty: 200, unit: "kg", price: 42 }, { name: "Sugar", qty: 50, unit: "kg", price: 50 }],
        subtotal: 10900, tax: 545, totalAmount: 11445,
        notes: "Delivery requested before 5 PM today",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-2024-090",
        status: "PROCESSING",
        items: [{ name: "Basmati Rice Premium", qty: 100, unit: "kg", price: 105 }, { name: "Toor Dal", qty: 80, unit: "kg", price: 138 }],
        subtotal: 21540, tax: 1077, totalAmount: 22617,
        notes: "Singh & Sons regular monthly order",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-2024-091",
        status: "CONFIRMED",
        items: [{ name: "Sunflower Oil", qty: 200, unit: "liter", price: 155 }, { name: "Mustard Oil", qty: 100, unit: "liter", price: 165 }],
        subtotal: 47500, tax: 2375, totalAmount: 49875,
        notes: "Hotel Grand Plaza — first order",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        orderNumber: "ORD-2024-088",
        status: "DELIVERED",
        items: [{ name: "Chana Dal", qty: 150, unit: "kg", price: 108 }],
        subtotal: 16200, tax: 810, totalAmount: 17010,
        notes: "Delivered to Mehta Traders",
        organizationId: org.id,
        createdAt: new Date(today.getTime() - 6 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ 4 orders created (₹1,00,947 today's revenue)");

  // ── Reports (some submitted today, some NOT) ──────────────
  const reportDate = new Date();
  reportDate.setHours(9, 30, 0, 0);

  await prisma.report.createMany({
    data: [
      {
        type: "DAILY_WORK",
        data: { summary: "Visited 5 clients. Collected ₹45,000 from Mehta Traders. Confirmed order from Singh & Sons.", visitCount: 5, collectionAmount: 45000 },
        submittedById: admin.id,
        organizationId: org.id,
        date: reportDate,
        source: "APP",
      },
      {
        type: "VENDOR_RATE",
        data: { items: ["Wheat @ ₹32/kg", "Toor Dal @ ₹115/kg", "Mustard Oil @ ₹135/L"], supplier: "Sharma Traders", notes: "Rates valid till tomorrow only" },
        submittedById: vendor.id,
        organizationId: org.id,
        date: reportDate,
        source: "APP",
      },
    ],
    // NOTE: manager (Raj Sharma), employee (Priya Patel), employee2 (Suresh Kumar)
    // have NOT submitted — AI will flag them
  });

  console.log("✅ Reports: 2 submitted, 3 pending (Raj Sharma, Priya Patel, Suresh Kumar missing)");

  // ── Automations ───────────────────────────────────────────
  await prisma.automation.deleteMany({ where: { organizationId: org.id } });
  await prisma.automation.createMany({
    data: [
      {
        name: "Daily report reminder at 6 PM",
        description: "Send WhatsApp reminder to employees who haven't submitted their daily report by 6 PM",
        active: true,
        trigger: { event: "REPORT_MISSING", conditions: [{ field: "hour", operator: "gte", value: 18 }] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Hi {{name}}, please submit your daily report before 8 PM. Reply with your work summary." } }],
        organizationId: org.id,
      },
      {
        name: "New lead welcome message",
        description: "Automatically send a welcome WhatsApp when a new lead is added",
        active: true,
        trigger: { event: "LEAD_CREATED", conditions: [] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Hi {{name}}! Thank you for your interest in Demo Company. Our team will contact you within 2 hours. 🙏" } }],
        organizationId: org.id,
      },
      {
        name: "Low stock alert to manager",
        description: "Notify manager instantly when any item falls below minimum stock level",
        active: true,
        trigger: { event: "STOCK_LOW", conditions: [] },
        actions: [{ type: "NOTIFY_MANAGER", params: { message: "⚠️ URGENT: {{itemName}} stock is critically low — {{quantity}} {{unit}} remaining (minimum: {{threshold}})." } }],
        organizationId: org.id,
      },
      {
        name: "Overdue payment follow-up",
        description: "Send automatic payment reminder when invoice is overdue by 7 days",
        active: true,
        trigger: { event: "PAYMENT_OVERDUE", conditions: [{ field: "days_overdue", operator: "gte", value: 7 }] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Dear {{name}}, this is a reminder that payment of ₹{{amount}} is overdue. Please settle at the earliest to avoid order holds." } }],
        organizationId: org.id,
      },
    ],
  });

  console.log("✅ 4 automations created");
  console.log("\n🎉 Demo data seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login: owner@demo.com / Demo@1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 DEMO DATA SUMMARY:");
  console.log("• 10 leads across all pipeline stages");
  console.log("• 8 tasks — 4 OVERDUE (urgent content for demo)");
  console.log("• 10 inventory items — 4 BELOW minimum threshold");
  console.log("• 12 supplier rates submitted today");
  console.log("• 4 orders today — ₹1,00,947 total revenue");
  console.log("• 3 staff have NOT submitted reports today");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
