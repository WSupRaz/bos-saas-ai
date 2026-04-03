// apps/web/app/api/messages/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { WhatsAppService } from "@/services/whatsapp.service";
import { EmailService } from "@/services/email.service";

const sendSchema = z.object({
  channel:     z.enum(["WHATSAPP","EMAIL"]),
  to:          z.string().min(1),
  body:        z.string().min(1),
  subject:     z.string().optional(),   // email only
  leadId:      z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "messages:read");

    const { searchParams } = new URL(req.url);
    const channel   = searchParams.get("channel");
    const leadId    = searchParams.get("leadId");
    const status    = searchParams.get("status");
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit     = Math.min(50, Number(searchParams.get("limit") ?? 25));

    const where = {
      organizationId: ctx.orgId,
      ...(channel ? { channel: channel as never } : {}),
      ...(leadId  ? { leadId }  : {}),
      ...(status  ? { status: status as never }  : {}),
    };

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          lead:     { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
      prisma.message.count({ where }),
    ]);

    return Response.json({ data: messages, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "messages:send");

    const body = sendSchema.parse(await req.json());
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;

    let message;

    if (body.channel === "WHATSAPP") {
      const wa = new WhatsAppService();
      message = await wa.send({
        to:          body.to,
        body:        body.body,
        orgId:       ctx.orgId,
        leadId:      body.leadId,
        scheduledAt,
      });
    } else {
      const em = new EmailService();
      message = await em.send({
        to:          body.to,
        subject:     body.subject ?? "(no subject)",
        html:        body.body,
        orgId:       ctx.orgId,
        leadId:      body.leadId,
        scheduledAt,
      });
    }

    return Response.json(message, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
