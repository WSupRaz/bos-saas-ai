// apps/web/services/automation.service.ts
import prisma from "@/lib/db";
import { automationQueue } from "@/lib/queues";
import type { AutomationEvent } from "@bos/shared";

type Context = Record<string, unknown>;

type Condition = {
  field: string;
  operator: "equals" | "not_equals" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains";
  value: string | number | boolean;
};

type Action = {
  type:
    | "SEND_WHATSAPP"
    | "SEND_EMAIL"
    | "ASSIGN_TASK"
    | "UPDATE_LEAD_STATUS"
    | "NOTIFY_MANAGER"
    | "ADD_TAG";
  params: Record<string, string | number | boolean>;
};

type AutomationRule = {
  trigger: { event: AutomationEvent; conditions: Condition[] };
  actions: Action[];
};

/**
 * Fire an automation event. Finds all matching active automations for the org
 * and queues their actions for execution.
 *
 * Can be called inline from API routes or from the worker.
 */
export async function fireAutomation(
  event: AutomationEvent,
  context: Context
): Promise<void> {
  const orgId = context.orgId as string;
  if (!orgId) return;

  // Queue it for async processing to not block the API response
  await automationQueue.add("trigger-automations", { event, context });
}

/**
 * Actually process automations — runs inside the worker.
 */
export async function processAutomations(
  event: AutomationEvent,
  context: Context
): Promise<void> {
  const orgId = context.orgId as string;

  const automations = await prisma.automation.findMany({
    where: {
      organizationId: orgId,
      active: true,
    },
  });

  for (const automation of automations) {
    const rule = automation as unknown as { trigger: AutomationRule["trigger"]; actions: Action[] };

    // Check if this automation listens to this event
    if (rule.trigger.event !== event) continue;

    // Evaluate all conditions
    const conditionsPassed = rule.trigger.conditions.every((c: Condition) =>
      evaluateCondition(c, context)
    );
    if (!conditionsPassed) continue;

    // Execute each action
    for (const action of rule.actions) {
      try {
        await executeAction(action, context, orgId, automation.id);
      } catch (err) {
        console.error(
          `[Automation] Action ${action.type} failed for automation ${automation.id}:`,
          err
        );
        // Log failure but continue with next action
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            event,
            context,
            success: false,
            error: String(err),
          },
        });
      }
    }

    // Update run stats
    await prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });

    await prisma.automationLog.create({
      data: { automationId: automation.id, event, context, success: true },
    });
  }
}

function evaluateCondition(condition: Condition, context: Context): boolean {
  const value = context[condition.field];
  const cv = condition.value;

  switch (condition.operator) {
    case "equals":      return value === cv;
    case "not_equals":  return value !== cv;
    case "gt":          return Number(value) > Number(cv);
    case "lt":          return Number(value) < Number(cv);
    case "gte":         return Number(value) >= Number(cv);
    case "lte":         return Number(value) <= Number(cv);
    case "contains":    return String(value).toLowerCase().includes(String(cv).toLowerCase());
    case "not_contains": return !String(value).toLowerCase().includes(String(cv).toLowerCase());
    default:            return false;
  }
}

function interpolate(template: string, ctx: Context): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? ""));
}

async function executeAction(
  action: Action,
  ctx: Context,
  orgId: string,
  automationId: string
): Promise<void> {
  // Lazy-load services to avoid circular deps
  const { WhatsAppService } = await import("./whatsapp.service");
  const { EmailService } = await import("./email.service");
  const wa = new WhatsAppService();
  const em = new EmailService();

  console.log(`[Automation ${automationId}] Executing action: ${action.type}`);

  switch (action.type) {
    case "SEND_WHATSAPP": {
      const to = interpolate(String(action.params.to), ctx);
      const body = interpolate(String(action.params.message), ctx);
      if (to && body) {
        await wa.send({ to, body, orgId });
      }
      break;
    }

    case "SEND_EMAIL": {
      const to = interpolate(String(action.params.to), ctx);
      const subject = interpolate(String(action.params.subject ?? ""), ctx);
      const html = interpolate(String(action.params.body ?? ""), ctx);
      if (to && html) {
        await em.send({ to, subject, html, orgId });
      }
      break;
    }

    case "ASSIGN_TASK": {
      await prisma.task.create({
        data: {
          title: interpolate(String(action.params.title), ctx),
          description: action.params.description
            ? interpolate(String(action.params.description), ctx)
            : null,
          assigneeId: action.params.assigneeId
            ? String(action.params.assigneeId)
            : null,
          organizationId: orgId,
          priority: "HIGH",
          dueAt: action.params.dueDays
            ? new Date(Date.now() + Number(action.params.dueDays) * 86_400_000)
            : null,
          createdById: ctx.triggeredByUserId as string ?? (
            // Fall back to org owner if no user in context
            await prisma.user.findFirst({ where: { organizationId: orgId, role: "OWNER" }, select: { id: true } })
          )?.id ?? "system",
        },
      });
      break;
    }

    case "UPDATE_LEAD_STATUS": {
      const leadId = ctx.leadId as string;
      if (leadId && action.params.status) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: action.params.status as never },
        });
      }
      break;
    }

    case "NOTIFY_MANAGER": {
      const managers = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: ["MANAGER", "OWNER", "ADMIN"] } },
        select: { id: true, phone: true, email: true, name: true },
      });

      for (const mgr of managers) {
        const message = interpolate(String(action.params.message), {
          ...ctx,
          managerName: mgr.name,
        });

        // Notify via WhatsApp if phone exists
        if (mgr.phone) {
          await wa.send({ to: mgr.phone, body: message, orgId });
        }

        // Also create in-app notification
        await prisma.notification.create({
          data: {
            userId: mgr.id,
            organizationId: orgId,
            title: "Automation Alert",
            body: message,
            type: "warning",
          },
        });
      }
      break;
    }

    case "ADD_TAG": {
      const leadId = ctx.leadId as string;
      if (leadId && action.params.tag) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { tags: true } });
        if (lead && !lead.tags.includes(String(action.params.tag))) {
          await prisma.lead.update({
            where: { id: leadId },
            data: { tags: { push: String(action.params.tag) } },
          });
        }
      }
      break;
    }

    default:
      console.warn(`[Automation] Unknown action type: ${action.type}`);
  }
}
