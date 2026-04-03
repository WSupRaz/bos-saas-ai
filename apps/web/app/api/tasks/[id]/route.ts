// apps/web/app/api/tasks/[id]/route.ts
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "tasks:read");

    const task = await prisma.task.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
      include: {
        assignee:  { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        lead:      { select: { id: true, name: true, phone: true } },
      },
    });

    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
    return Response.json(task);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

const updateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status:      z.enum(["PENDING","IN_PROGRESS","DONE","CANCELLED"]).optional(),
  priority:    z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  assigneeId:  z.string().optional().nullable(),
  dueAt:       z.string().datetime().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Task not found" }, { status: 404 });

    // Employees can only update tasks assigned to them
    if (ctx.role === "EMPLOYEE" && existing.assigneeId !== ctx.userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = updateSchema.parse(await req.json());

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...body,
        dueAt:       body.dueAt ? new Date(body.dueAt) : body.dueAt,
        completedAt: body.status === "DONE" ? new Date() : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (body.status === "DONE" && existing.status !== "DONE") {
      void fireAutomation("TASK_COMPLETED", {
        orgId:   ctx.orgId,
        taskId:  updated.id,
        title:   updated.title,
        triggeredByUserId: ctx.userId,
      });
    }

    return Response.json(updated);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "tasks:delete");

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Task not found" }, { status: 404 });

    await prisma.task.delete({ where: { id: params.id } });
    return Response.json({ message: "Task deleted" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
