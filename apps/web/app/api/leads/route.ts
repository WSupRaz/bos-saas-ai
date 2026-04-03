// apps/web/app/api/leads/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

const createSchema = z.object({
  name:        z.string().min(1),
  phone:       z.string().optional(),
  email:       z.string().email().optional(),
  company:     z.string().optional(),
  source:      z.string().optional(),
  tags:        z.array(z.string()).optional(),
  notes:       z.string().optional(),
  value:       z.number().optional(),
  assignedToId: z.string().optional(),
  followUpAt:  z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "leads:read");

    const { searchParams } = new URL(req.url);
    const status      = searchParams.get("status");
    const search      = searchParams.get("search");
    const page        = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit       = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const assignedToId = searchParams.get("assignedToId");
    const tag         = searchParams.get("tag");

    const where = {
      organizationId: ctx.orgId,
      ...(status ? { status: status as never } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(search
        ? {
            OR: [
              { name:    { contains: search, mode: "insensitive" as const } },
              { email:   { contains: search, mode: "insensitive" as const } },
              { phone:   { contains: search } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          activities: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { type: true, note: true, createdAt: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return Response.json({ data: leads, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "leads:write");

    const body = await req.json();
    const data = createSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        ...data,
        tags:          data.tags ?? [],
        followUpAt:    data.followUpAt ? new Date(data.followUpAt) : null,
        organizationId: ctx.orgId,
      },
    });

    // Fire automation event (non-blocking)
    void fireAutomation("LEAD_CREATED", {
      orgId:              ctx.orgId,
      leadId:             lead.id,
      phone:              lead.phone ?? "",
      name:               lead.name,
      source:             lead.source ?? "",
      triggeredByUserId:  ctx.userId,
    });

    return Response.json(lead, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string; name?: string };
    if (e.name === "ZodError") return Response.json({ error: "Invalid data" }, { status: 400 });
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
