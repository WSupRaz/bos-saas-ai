// apps/web/app/api/ai/chat/route.ts
import OpenAI from "openai";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

// Provider priority: Cerebras → Together AI → DeepSeek → Groq → OpenRouter → OpenAI
const isCerebras   = !!process.env.CEREBRAS_API_KEY;
const isTogether   = !!process.env.TOGETHER_API_KEY;
const isDeepSeek   = !!process.env.DEEPSEEK_API_KEY;
const isGroq       = !!process.env.GROQ_API_KEY;
const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
const isGoogle     = !!process.env.GOOGLE_AI_KEY;

const openai = new OpenAI({
  apiKey: (
    isCerebras   ? process.env.CEREBRAS_API_KEY :
    isTogether   ? process.env.TOGETHER_API_KEY :
    isDeepSeek   ? process.env.DEEPSEEK_API_KEY :
    isGroq       ? process.env.GROQ_API_KEY :
    isOpenRouter ? process.env.OPENROUTER_API_KEY :
                   process.env.OPENAI_API_KEY
  ) ?? "not-configured",
  baseURL: isCerebras   ? "https://api.cerebras.ai/v1"
         : isTogether   ? "https://api.together.xyz/v1"
         : isDeepSeek   ? "https://api.deepseek.com/v1"
         : isGroq       ? "https://api.groq.com/openai/v1"
         : isOpenRouter ? "https://openrouter.ai/api/v1"
         : undefined,
  defaultHeaders: isOpenRouter
    ? {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title":      "BOS — Business Operating System",
      }
    : undefined,
});

const PINNED_MODEL  = process.env.AI_MODEL;
const DEFAULT_MODEL = isCerebras   ? "llama-3.3-70b"
                    : isTogether   ? "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
                    : isDeepSeek   ? "deepseek-chat"
                    : isGroq       ? "llama-3.3-70b-versatile"
                    : isOpenRouter ? "meta-llama/llama-3.3-70b-instruct:free"
                    : "gpt-4o-mini";

// ── Fetch live business data and build context string ─────────
async function getBusinessContext(orgId: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [users, reports, tasks, inventory, leads, rates, orders] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId, status: "ACTIVE", role: { in: ["EMPLOYEE","VENDOR","DISTRIBUTOR","MANAGER"] } },
      select: { id: true, name: true, role: true },
    }),
    prisma.report.findMany({
      where: { organizationId: orgId, date: { gte: today, lt: tomorrow } },
      select: { submittedById: true },
    }),
    prisma.task.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING","IN_PROGRESS"] }, dueAt: { lt: new Date() } },
      include: { assignee: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 15,
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.marketRate.findMany({
      where: { organizationId: orgId, recordedAt: { gte: today } },
      orderBy: { rate: "asc" },
      take: 20,
    }),
    prisma.order.aggregate({
      where: { organizationId: orgId, createdAt: { gte: today } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  const submittedIds = new Set(reports.map((r) => r.submittedById));
  const submitted    = users.filter((u) => submittedIds.has(u.id));
  const missing      = users.filter((u) => !submittedIds.has(u.id));
  const lowStock     = inventory.filter((i) => i.minThreshold !== null && i.quantity < i.minThreshold);

  return `
=== LIVE BUSINESS DATA (${new Date().toLocaleString()}) ===

DAILY REPORTS:
- Submitted today: ${submitted.map((u) => u.name).join(", ") || "None"}
- Not yet submitted: ${missing.map((u) => u.name).join(", ") || "All submitted ✓"}

OVERDUE TASKS (${tasks.length} total):
${tasks.length === 0 ? "No overdue tasks." : tasks.map((t) => `- "${t.title}" | Assignee: ${t.assignee?.name ?? "Unassigned"} | Due: ${t.dueAt?.toDateString()}`).join("\n")}

INVENTORY (${inventory.length} items):
${inventory.map((i) => `- ${i.name}: ${i.quantity} ${i.unit}${i.minThreshold && i.quantity < i.minThreshold ? " ⚠️ LOW STOCK" : ""}`).join("\n")}
${lowStock.length > 0 ? `\nLOW STOCK ALERT: ${lowStock.map((i) => `${i.name} (${i.quantity}/${i.minThreshold} ${i.unit})`).join(", ")}` : ""}

SUPPLIER RATES TODAY:
${rates.length === 0 ? "No rates submitted today." : rates.map((r) => `- ${r.item}: ${r.source} @ ${r.rate} per ${r.unit}`).join("\n")}

LEADS BY STATUS:
${leads.map((l) => `- ${l.status}: ${l._count.id}`).join("\n") || "No leads data."}

TODAY'S ORDERS: ${orders._count.id} orders | Revenue: ${orders._sum.totalAmount ?? 0}
`.trim();
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "ai:chat");

    const { messages } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!isCerebras && !isTogether && !isDeepSeek && !isGroq && !isOpenRouter && !isGoogle && !process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "AI not configured. Add GOOGLE_AI_KEY to your environment variables." },
        { status: 503 }
      );
    }

    const [org, businessContext] = await Promise.all([
      prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { name: true } }),
      getBusinessContext(ctx.orgId),
    ]);

    const systemPrompt = `You are the AI business assistant for ${org?.name ?? "this organisation"}.
You have access to real-time business data shown below. Use it to answer questions accurately.
Be concise, data-driven, and actionable. Suggest next steps when you spot issues.
Respond in the same language the user writes in.

${businessContext}`;

    let reply: string;

    if (isGoogle && !isDeepSeek && !isGroq) {
      // Use Google's native Generative Language API directly (avoids OpenAI compat layer rate limits)
      const model = PINNED_MODEL ?? "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_KEY}`;
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const gRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1000 },
        }),
      });
      if (!gRes.ok) {
        const errText = await gRes.text();
        throw Object.assign(new Error(errText || `Google AI error ${gRes.status}`), { status: gRes.status });
      }
      const gData = await gRes.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      reply = gData.candidates[0]?.content?.parts[0]?.text ?? "Sorry, I couldn't get a response.";
    } else {
      const response = await openai.chat.completions.create({
        model:    PINNED_MODEL ?? DEFAULT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1000,
      }) as OpenAI.Chat.ChatCompletion;
      reply = response.choices[0].message.content ?? "Sorry, I couldn't get a response.";
    }

    return Response.json({ reply });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("[AI Chat]", e);
    return Response.json({ error: e.message ?? "AI request failed" }, { status: e.status ?? 500 });
  }
}
