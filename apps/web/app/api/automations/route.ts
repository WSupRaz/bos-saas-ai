// apps/web/app/api/automations/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

const conditionSchema = z.object({
  field:    z.string(),
  operator: z.enum(["equals","not_equals","gt","lt","gte","lte","contains","not_contains"]),
  value:    z.union([z.string(), z.number(), z.boolean()]),
});

const actionSchema = z.object({
  type:   z.enum(["SEND_WHATSAPP","SEND_EMAIL","ASSIGN_TASK","UPDATE_LEAD_STATUS","NOTIFY_MANAGER","ADD_TAG"]),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

const createSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  active:      z.boolean().default(true),
  trigger: z.object({
    event:      z.string(),
    conditions: z.array(conditionSchema).default([]),
  }),
  actions: z.array(actionSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "automations:read");

    const automations = await prisma.automation.findMany({
      where:   { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: automations });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "automations:write");

    const body = createSchema.parse(await req.json());

    const automation = await prisma.automation.create({
      data: {
        name:           body.name,
        description:    body.description ?? null,
        active:         body.active,
        trigger:        body.trigger,
        actions:        body.actions,
        organizationId: ctx.orgId,
      },
    });

    return Response.json(automation, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
