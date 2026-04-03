// apps/web/app/api/tasks/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

const createSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  priority:    z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
  assigneeId:  z.string().optional(),
  leadId:      z.string().optional(),
  dueAt:       z.string().datetime().optional(),
  recurring:   z.object({
    freq:    z.enum(["daily","weekly","monthly"]),
    days:    z.array(z.number().min(0).max(6)).optional(),
    endDate: z.string().optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "tasks:read");

    const { searchParams } = new URL(req.url);
    const status     = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit      = Math.min(100, Number(searchParams.get("limit") ?? 25));
    const overdue    = searchParams.get("overdue") === "true";

    // Employees only see their own tasks
    const forceAssignee =
      ctx.role === "EMPLOYEE" ? ctx.userId : assigneeId ?? undefined;

    const where = {
      organizationId: ctx.orgId,
      ...(status ? { status: status as never } : {}),
      ...(forceAssignee ? { assigneeId: forceAssignee } : {}),
      ...(overdue
        ? { dueAt: { lt: new Date() }, status: { in: ["PENDING","IN_PROGRESS"] as never[] } }
        : {}),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        include: {
          assignee:  { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          lead:      { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return Response.json({ data: tasks, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "tasks:write");

    const body = createSchema.parse(await req.json());

    const task = await prisma.task.create({
      data: {
        ...body,
        dueAt:          body.dueAt ? new Date(body.dueAt) : null,
        recurring:      body.recurring ?? null,
        organizationId: ctx.orgId,
        createdById:    ctx.userId,
      },
      include: {
        assignee:  { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return Response.json(task, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
