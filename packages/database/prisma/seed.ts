// packages/database/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-company" },
    update: {},
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

  console.log(`✅ Organization: ${org.name}`);

  // Create owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: {
      email: "owner@demo.com",
      name: "Demo Owner",
      passwordHash: await bcrypt.hash("Demo@1234", 12),
      role: "OWNER",
      phone: "919876543210",
      organizationId: org.id,
    },
  });

  // Create admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Demo Admin",
      passwordHash: await bcrypt.hash("Demo@1234", 12),
      role: "ADMIN",
      phone: "919876543211",
      organizationId: org.id,
    },
  });

  // Create manager
  await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      email: "manager@demo.com",
      name: "Raj Sharma",
      passwordHash: await bcrypt.hash("Demo@1234", 12),
      role: "MANAGER",
      phone: "919876543212",
      organizationId: org.id,
    },
  });

  // Create employee
  await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: {
      email: "employee@demo.com",
      name: "Priya Patel",
      passwordHash: await bcrypt.hash("Demo@1234", 12),
      role: "EMPLOYEE",
      phone: "919876543213",
      organizationId: org.id,
    },
  });

  console.log("✅ Users created (password: Demo@1234 for all)");

  // Create sample leads
  const leads = [
    { name: "Vikram Mehta", phone: "919876540001", email: "vikram@example.com", company: "Mehta Traders", status: "NEW" as const, source: "whatsapp", tags: ["wholesale"], value: 50000 },
    { name: "Sunita Rao", phone: "919876540002", email: "sunita@example.com", company: "Rao Distributors", status: "CONTACTED" as const, source: "referral", tags: ["distributor"], value: 120000 },
    { name: "Anil Kumar", phone: "919876540003", email: "anil@example.com", company: "Kumar Enterprises", status: "QUALIFIED" as const, source: "website", tags: ["retail"], value: 35000 },
    { name: "Deepa Singh", phone: "919876540004", email: "deepa@example.com", company: "Singh & Sons", status: "PROPOSAL" as const, source: "manual", tags: ["vip"], value: 200000 },
    { name: "Mohan Das", phone: "919876540005", company: "Das Trading Co", status: "CLOSED_WON" as const, source: "whatsapp", tags: ["wholesale", "regular"], value: 75000 },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: { ...lead, organizationId: org.id } });
  }

  console.log(`✅ ${leads.length} leads created`);

  // Create sample inventory
  const inventory = [
    { name: "Wheat Flour", sku: "WF-001", quantity: 500, unit: "kg", minThreshold: 100, costPrice: 35, sellingPrice: 42, category: "Grains" },
    { name: "Basmati Rice", sku: "BR-001", quantity: 300, unit: "kg", minThreshold: 50, costPrice: 85, sellingPrice: 105, category: "Grains" },
    { name: "Mustard Oil", sku: "MO-001", quantity: 150, unit: "liter", minThreshold: 30, costPrice: 140, sellingPrice: 165, category: "Oils" },
    { name: "Sugar", sku: "SU-001", quantity: 200, unit: "kg", minThreshold: 50, costPrice: 42, sellingPrice: 50, category: "Sweeteners" },
    { name: "Toor Dal", sku: "TD-001", quantity: 80, unit: "kg", minThreshold: 25, costPrice: 115, sellingPrice: 138, category: "Pulses" },
  ];

  for (const item of inventory) {
    await prisma.inventoryItem.create({ data: { ...item, organizationId: org.id } });
  }

  console.log(`✅ ${inventory.length} inventory items created`);

  // Create sample automations
  await prisma.automation.createMany({
    data: [
      {
        name: "Chase missing daily reports",
        description: "If employee hasn't submitted report by 6pm, send WhatsApp reminder",
        active: true,
        trigger: { event: "REPORT_MISSING", conditions: [{ field: "hour", operator: "gte", value: 18 }] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Hi {{name}}, please submit your daily report. Reply with: Work done: [your summary]" } }],
        organizationId: org.id,
      },
      {
        name: "New lead welcome message",
        description: "Send welcome WhatsApp when new lead is created",
        active: true,
        trigger: { event: "LEAD_CREATED", conditions: [] },
        actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "Hi {{name}}! Thanks for your interest in {{orgName}}. We'll be in touch shortly. 🙏" } }],
        organizationId: org.id,
      },
      {
        name: "Low stock alert",
        description: "Notify manager when inventory falls below threshold",
        active: true,
        trigger: { event: "STOCK_LOW", conditions: [] },
        actions: [{ type: "NOTIFY_MANAGER", params: { message: "⚠️ Low stock alert: {{itemName}} is at {{quantity}} {{unit}}. Minimum threshold: {{threshold}} {{unit}}." } }],
        organizationId: org.id,
      },
    ],
  });

  console.log("✅ Sample automations created");
  console.log("\n🎉 Seed complete!");
  console.log("Login: owner@demo.com / Demo@1234");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
