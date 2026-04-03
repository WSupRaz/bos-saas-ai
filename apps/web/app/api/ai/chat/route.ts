// apps/web/app/api/ai/chat/route.ts
import OpenAI from "openai";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Tool definitions ─────────────────────────────────────────
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_report_summary_today",
      description: "Returns which employees/vendors submitted reports today and who is missing.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_best_supplier_today",
      description: "Compare supplier rates submitted today and find the cheapest for a given item.",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string", description: "Item name, e.g. 'wheat', 'sugar'" },
        },
        required: ["item"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_overdue_tasks",
      description: "Get a list of overdue or high-priority tasks in the organisation.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "Check current stock levels. Flags items below minimum threshold.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leads_summary",
      description: "Return lead counts by status and list of leads needing follow-up today.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_orders_summary",
      description: "Return recent order totals and pending order list.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ── Tool executors ───────────────────────────────────────────
async function executeTool(name: string, args: Record<string, string>, orgId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (name) {
    case "get_report_summary_today": {
      const [users, reports] = await Promise.all([
        prisma.user.findMany({
          where: { organizationId: orgId, status: "ACTIVE", role: { in: ["EMPLOYEE","VENDOR","DISTRIBUTOR","MANAGER"] } },
          select: { id: true, name: true, role: true },
        }),
        prisma.report.findMany({
          where: { organizationId: orgId, date: { gte: today, lt: tomorrow } },
          select: { submittedById: true, type: true },
        }),
      ]);

      const submitted = new Set(reports.map((r) => r.submittedById));
      return {
        submitted: users.filter((u) => submitted.has(u.id)).map((u) => u.name),
        missing:   users.filter((u) => !submitted.has(u.id)).map((u) => u.name),
        total:     users.length,
        report_count: reports.length,
      };
    }

    case "get_best_supplier_today": {
      const rates = await prisma.marketRate.findMany({
        where: {
          organizationId: orgId,
          item: { contains: args.item, mode: "insensitive" },
          recordedAt: { gte: today },
        },
        orderBy: { rate: "asc" },
      });
      if (!rates.length) return { message: `No rates submitted today for "${args.item}".` };
      return {
        best_supplier: rates[0].source,
        best_rate:     rates[0].rate,
        unit:          rates[0].unit,
        all_rates:     rates.map((r) => ({ source: r.source, rate: r.rate })),
        savings_vs_worst: rates.length > 1 ? rates[rates.length - 1].rate - rates[0].rate : 0,
      };
    }

    case "get_overdue_tasks": {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: new Date() },
        },
        include: { assignee: { select: { name: true } } },
        orderBy: { dueAt: "asc" },
        take: 20,
      });
      return {
        count: tasks.length,
        tasks: tasks.map((t) => ({
          title:    t.title,
          priority: t.priority,
          assignee: t.assignee?.name ?? "Unassigned",
          due:      t.dueAt?.toISOString().slice(0, 10),
        })),
      };
    }

    case "get_inventory_status": {
      const items = await prisma.inventoryItem.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      });
      const low = items.filter((i) => i.minThreshold !== null && i.quantity < i.minThreshold);
      return {
        total_items:  items.length,
        low_stock:    low.map((i) => ({ name: i.name, quantity: i.quantity, min: i.minThreshold, unit: i.unit })),
        all_items:    items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
      };
    }

    case "get_leads_summary": {
      const [leads, followUps] = await Promise.all([
        prisma.lead.groupBy({
          by: ["status"],
          where: { organizationId: orgId },
          _count: { id: true },
        }),
        prisma.lead.findMany({
          where: { organizationId: orgId, followUpAt: { gte: today, lt: tomorrow } },
          select: { name: true, phone: true, status: true },
          take: 10,
        }),
      ]);
      return {
        by_status:   leads.map((l) => ({ status: l.status, count: l._count.id })),
        follow_ups_today: followUps,
      };
    }

    case "get_orders_summary": {
      const [pending, recent] = await Promise.all([
        prisma.order.findMany({
          where: { organizationId: orgId, status: { in: ["PENDING","CONFIRMED","PROCESSING"] } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { orderNumber: true, totalAmount: true, status: true, createdAt: true },
        }),
        prisma.order.aggregate({
          where: { organizationId: orgId, createdAt: { gte: today } },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
      ]);
      return {
        today_orders: recent._count.id,
        today_revenue: recent._sum.totalAmount ?? 0,
        pending_orders: pending,
      };
    }

    default:
      return { error: "Unknown tool" };
  }
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "ai:chat");

    const { messages } = (await req.json()) as {
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
    };

    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { name: true },
    });

    const systemPrompt = `You are the AI business assistant for ${org?.name ?? "this organisation"}.
You help owners and managers make smarter decisions using real-time business data.
Always use available tools to fetch live data before answering questions about reports, rates, stock, leads, or tasks.
Be concise, data-driven, and actionable. Respond in the same language the user writes in.
When you find missing reports, low stock, or overdue tasks — always suggest a concrete next step.`;

    let response = await openai.chat.completions.create({
      model:       "gpt-4o",
      messages:    [{ role: "system", content: systemPrompt }, ...messages],
      tools:       TOOLS,
      tool_choice: "auto",
      max_tokens:  1000,
    });

    // Agentic loop — keep calling tools until the model stops
    while (response.choices[0].finish_reason === "tool_calls") {
      const toolCalls = response.choices[0].message.tool_calls!;

      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const args   = JSON.parse(tc.function.arguments) as Record<string, string>;
          const result = await executeTool(tc.function.name, args, ctx.orgId);
          return {
            tool_call_id: tc.id,
            role:         "tool" as const,
            content:      JSON.stringify(result),
          };
        })
      );

      response = await openai.chat.completions.create({
        model:    "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          response.choices[0].message,
          ...toolResults,
        ],
        tools: TOOLS,
      });
    }

    return Response.json({
      reply: response.choices[0].message.content,
      usage: response.usage,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
