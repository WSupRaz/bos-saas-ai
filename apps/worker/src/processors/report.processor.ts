// apps/worker/src/processors/report.processor.ts
import { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import Redis from "ioredis";

const prisma = new PrismaClient();

function getMsgQueue() {
  const conn = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  return new Queue("messages", { connection: conn });
}

export async function handleReportJob(job: Job) {
  const { type } = job.data as { type: string; orgId?: string };

  switch (type) {
    case "SEND_REPORT_REQUEST":
      await sendDailyReportRequests();
      break;
    case "FOLLOWUP_MISSING_REPORTS":
      await followUpMissingReports();
      break;
    case "COLLECT_MARKET_RATES":
      await requestMarketRates();
      break;
    case "CHECK_OVERDUE_TASKS":
      await checkOverdueTasks();
      break;
    default:
      console.warn("[ReportWorker] Unknown job type:", type);
  }
}

// ── 8am: Ask employees to submit daily report ─────────────────
async function sendDailyReportRequests() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  const q    = getMsgQueue();

  for (const org of orgs) {
    const employees = await prisma.user.findMany({
      where:  { organizationId: org.id, status: "ACTIVE", role: { in: ["EMPLOYEE","MANAGER"] } },
      select: { id: true, name: true, phone: true },
    });

    for (const emp of employees) {
      if (!emp.phone) continue;
      await q.add("send-whatsapp", {
        to:    emp.phone,
        body:  `Good morning ${emp.name}! 🌅\nPlease submit your daily work report.\n\nReply with:\n*Work done: [your summary]*\n\nExample: Work done: Visited 5 clients, collected payment from Sharma ji`,
        orgId: org.id,
      });
    }
    console.log(`[Cron] Sent report requests to ${employees.length} employees in org ${org.id}`);
  }
}

// ── 6pm: Chase employees who haven't submitted ────────────────
async function followUpMissingReports() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  const q    = getMsgQueue();

  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  for (const org of orgs) {
    const employees = await prisma.user.findMany({
      where:  { organizationId: org.id, status: "ACTIVE", role: { in: ["EMPLOYEE","MANAGER"] } },
      select: { id: true, name: true, phone: true },
    });

    const submitted = await prisma.report.findMany({
      where:  { organizationId: org.id, date: { gte: today, lt: tomorrow } },
      select: { submittedById: true },
    });

    const submittedIds = new Set(submitted.map((r) => r.submittedById));
    const missing      = employees.filter((e) => !submittedIds.has(e.id));

    for (const emp of missing) {
      if (!emp.phone) continue;
      await q.add("send-whatsapp", {
        to:    emp.phone,
        body:  `Hi ${emp.name}, we haven't received your daily report yet. ⏰\n\nPlease reply with:\n*Work done: [summary]*`,
        orgId: org.id,
      });
    }

    // Notify managers about missing reports
    if (missing.length > 0) {
      const managers = await prisma.user.findMany({
        where:  { organizationId: org.id, role: { in: ["OWNER","ADMIN","MANAGER"] }, status: "ACTIVE" },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId:         m.id,
          organizationId: org.id,
          title:          "Missing Reports",
          body:           `${missing.length} team member(s) haven't submitted reports: ${missing.map((e) => e.name).join(", ")}`,
          type:           "warning",
          link:           "/reports",
        })),
      });
    }

    console.log(`[Cron] Chased ${missing.length} missing reports in org ${org.id}`);
  }
}

// ── 7am: Request market rates from vendors/distributors ───────
async function requestMarketRates() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  const q    = getMsgQueue();

  for (const org of orgs) {
    const vendors = await prisma.user.findMany({
      where:  { organizationId: org.id, status: "ACTIVE", role: { in: ["VENDOR","DISTRIBUTOR"] } },
      select: { id: true, name: true, phone: true },
    });

    for (const vendor of vendors) {
      if (!vendor.phone) continue;
      await q.add("send-whatsapp", {
        to:    vendor.phone,
        body:  `Good morning ${vendor.name}! 📊\nPlease share today's rates.\n\nReply format:\n*Rate: [amount]* (for your main item)\n\nExample: Rate: 3200`,
        orgId: org.id,
      });
    }
  }
}

// ── Midnight: Check overdue tasks and notify assignees ─────────
async function checkOverdueTasks() {
  const overdue = await prisma.task.findMany({
    where: {
      status: { in: ["PENDING","IN_PROGRESS"] },
      dueAt:  { lt: new Date() },
    },
    include: {
      assignee:     { select: { id: true, name: true, phone: true } },
      organization: { select: { id: true } },
    },
    take: 500,
  });

  const q = getMsgQueue();

  for (const task of overdue) {
    if (!task.assignee) continue;

    // Fire TASK_OVERDUE automation
    const { Queue: Q } = await import("bullmq");
    const Redis2        = (await import("ioredis")).default;
    const conn          = new Redis2(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    const aq            = new Q("automations", { connection: conn });
    await aq.add("trigger-automations", {
      event:   "TASK_OVERDUE",
      context: {
        orgId:             task.organization.id,
        taskId:            task.id,
        title:             task.title,
        assigneeName:      task.assignee.name,
        phone:             task.assignee.phone ?? "",
        dueAt:             task.dueAt?.toISOString(),
        triggeredByUserId: task.assignee.id,
      },
    });

    // In-app notification
    await prisma.notification.create({
      data: {
        userId:         task.assignee.id,
        organizationId: task.organization.id,
        title:          "Task Overdue",
        body:           `"${task.title}" was due ${task.dueAt?.toLocaleDateString()}`,
        type:           "warning",
        link:           "/tasks",
      },
    });
  }

  console.log(`[Cron] Processed ${overdue.length} overdue tasks`);
}
