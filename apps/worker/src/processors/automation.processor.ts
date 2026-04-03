// apps/worker/src/processors/automation.processor.ts
import { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { AutomationEvent } from "@bos/shared";

const prisma = new PrismaClient();

type Context = Record<string, unknown>;
type Condition = {
  field:    string;
  operator: "equals" | "not_equals" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains";
  value:    string | number | boolean;
};
type Action = {
  type:   string;
  params: Record<string, string | number | boolean>;
};

export async function handleAutomationJob(job: Job) {
  const { event, context } = job.data as {
    event:   AutomationEvent;
    context: Context;
  };

  const orgId = context.orgId as string;
  if (!orgId) return;

  const automations = await prisma.automation.findMany({
    where: { organizationId: orgId, active: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as { event: string; conditions: Condition[] };
    if (trigger.event !== event) continue;

    const pass = (trigger.conditions ?? []).every((c) => evalCondition(c, context));
    if (!pass) continue;

    for (const action of automation.actions as Action[]) {
      try {
        await executeAction(action, context, orgId);
      } catch (err) {
        console.error(`[Automation ${automation.id}] Action ${action.type} failed:`, err);
        await prisma.automationLog.create({
          data: { automationId: automation.id, event, context, success: false, error: String(err) },
        });
      }
    }

    await prisma.automation.update({
      where: { id: automation.id },
      data:  { runCount: { increment: 1 }, lastRunAt: new Date() },
    });

    await prisma.automationLog.create({
      data: { automationId: automation.id, event, context, success: true },
    });
  }
}

function evalCondition(c: Condition, ctx: Context): boolean {
  const val = ctx[c.field];
  switch (c.operator) {
    case "equals":      return val === c.value;
    case "not_equals":  return val !== c.value;
    case "gt":          return Number(val) >  Number(c.value);
    case "lt":          return Number(val) <  Number(c.value);
    case "gte":         return Number(val) >= Number(c.value);
    case "lte":         return Number(val) <= Number(c.value);
    case "contains":    return String(val).toLowerCase().includes(String(c.value).toLowerCase());
    case "not_contains":return !String(val).toLowerCase().includes(String(c.value).toLowerCase());
    default:            return false;
  }
}

function interpolate(tpl: string, ctx: Context): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(ctx[k] ?? ""));
}

async function executeAction(action: Action, ctx: Context, orgId: string) {
  switch (action.type) {
    case "SEND_WHATSAPP": {
      const to   = interpolate(String(action.params.to),      ctx);
      const body = interpolate(String(action.params.message), ctx);
      if (!to || !body) return;

      const msg = await prisma.message.create({
        data: { channel: "WHATSAPP", direction: "OUTBOUND", to, from: process.env.WA_PHONE_NUMBER ?? "", body, status: "PENDING", organizationId: orgId },
      });

      const { Queue } = await import("bullmq");
      const Redis     = (await import("ioredis")).default;
      const conn      = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
      const q         = new Queue("messages", { connection: conn });
      await q.add("send-whatsapp", { messageId: msg.id });
      break;
    }

    case "SEND_EMAIL": {
      const to      = interpolate(String(action.params.to),      ctx);
      const subject = interpolate(String(action.params.subject ?? ""), ctx);
      const html    = interpolate(String(action.params.body),    ctx);
      if (!to || !html) return;

      const msg = await prisma.message.create({
        data: { channel: "EMAIL", direction: "OUTBOUND", to, from: process.env.EMAIL_FROM_ADDRESS ?? "", body: html, metadata: { subject }, status: "PENDING", organizationId: orgId },
      });

      const { Queue } = await import("bullmq");
      const Redis     = (await import("ioredis")).default;
      const conn      = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
      const q         = new Queue("emails", { connection: conn });
      await q.add("send-email", { messageId: msg.id });
      break;
    }

    case "ASSIGN_TASK": {
      const owner = await prisma.user.findFirst({ where: { organizationId: orgId, role: "OWNER" }, select: { id: true } });
      await prisma.task.create({
        data: {
          title:          interpolate(String(action.params.title), ctx),
          assigneeId:     action.params.assigneeId ? String(action.params.assigneeId) : null,
          organizationId: orgId,
          priority:       "HIGH",
          createdById:    ctx.triggeredByUserId as string ?? owner!.id,
          dueAt:          action.params.dueDays ? new Date(Date.now() + Number(action.params.dueDays) * 86_400_000) : null,
        },
      });
      break;
    }

    case "NOTIFY_MANAGER": {
      const managers = await prisma.user.findMany({
        where:  { organizationId: orgId, role: { in: ["OWNER","ADMIN","MANAGER"] }, status: "ACTIVE" },
        select: { id: true, phone: true },
      });
      for (const mgr of managers) {
        await prisma.notification.create({
          data: { userId: mgr.id, organizationId: orgId, title: "Automation Alert", body: interpolate(String(action.params.message), ctx), type: "warning" },
        });
      }
      break;
    }

    case "UPDATE_LEAD_STATUS": {
      const leadId = ctx.leadId as string;
      if (leadId && action.params.status) {
        await prisma.lead.update({ where: { id: leadId }, data: { status: action.params.status as never } });
      }
      break;
    }

    default:
      console.warn(`[Automation] Unknown action: ${action.type}`);
  }
}
