// apps/web/app/api/webhooks/whatsapp/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { parseWhatsAppReply, findUserByPhone } from "@/services/reply-parser";
import { fireAutomation } from "@/services/automation.service";
import { WhatsAppService } from "@/services/whatsapp.service";

// ── GET: Meta webhook verification ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verified ✓");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ── POST: Receive messages and status updates ────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Acknowledge immediately (Meta requires < 5s response)
  processWebhook(body).catch((err) =>
    console.error("[WhatsApp Webhook] Processing error:", err)
  );

  return Response.json({ status: "ok" });
}

async function processWebhook(body: Record<string, unknown>) {
  const entry = (body?.entry as Array<Record<string, unknown>>)?.[0];
  const change = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value  = change?.value as Record<string, unknown> | undefined;

  if (!value) return;

  const phoneNumberId = (value.metadata as Record<string, string>)?.phone_number_id;

  // Find organization by their WA phone number ID stored in settings
  const org = await prisma.organization.findFirst({
    where: {
      settings: { path: ["waPhoneId"], equals: phoneNumberId },
    },
  });

  if (!org) {
    console.warn(`[WhatsApp] No org found for phone ID: ${phoneNumberId}`);
    return;
  }

  // ── Handle incoming messages ──────────────────────────────
  const messages = value.messages as Array<Record<string, unknown>> | undefined;
  if (messages?.length) {
    for (const msg of messages) {
      await handleInboundMessage(msg, org.id, value);
    }
  }

  // ── Handle status updates (sent / delivered / read / failed) ─
  const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
  if (statuses?.length) {
    const wa = new WhatsAppService();
    for (const s of statuses) {
      await wa.handleStatusUpdate(
        s.id as string,
        s.status as string
      );
    }
  }
}

async function handleInboundMessage(
  msg: Record<string, unknown>,
  orgId: string,
  value: Record<string, unknown>
) {
  const from  = msg.from as string;
  const type  = msg.type as string;
  const text  = type === "text"
    ? (msg.text as Record<string, string>)?.body ?? ""
    : "";

  const displayPhone = (value.metadata as Record<string, string>)?.display_phone_number;

  // Persist inbound message
  const inbound = await prisma.message.create({
    data: {
      channel:        "WHATSAPP",
      direction:      "INBOUND",
      from,
      to:             displayPhone ?? "",
      body:           text,
      status:         "DELIVERED",
      externalId:     msg.id as string,
      organizationId: orgId,
      metadata:       msg as never,
    },
  });

  // Try to link to a lead by phone
  const leadWithPhone = await prisma.lead.findFirst({
    where: { organizationId: orgId, phone: from },
    select: { id: true },
  });

  if (leadWithPhone) {
    await prisma.message.update({
      where: { id: inbound.id },
      data:  { leadId: leadWithPhone.id },
    });
  }

  // Try parsing structured reports: "Stock: 200", "Rate: 3100", etc.
  if (text) {
    const parsed = parseWhatsAppReply(text);
    if (parsed) {
      const userId = await findUserByPhone(from, orgId, prisma);

      await prisma.report.create({
        data: {
          type:           parsed.type,
          data:           parsed.data,
          organizationId: orgId,
          submittedById:  userId ?? await getOrgOwner(orgId),
          source:         "WHATSAPP",
          parsedFromWA:   true,
        },
      });

      console.log(`[WhatsApp] Parsed ${parsed.type} report from ${from}`);
    }

    // Fire automation for any WhatsApp reply
    void fireAutomation("WHATSAPP_REPLY", {
      orgId,
      from,
      text,
      leadId:            leadWithPhone?.id ?? "",
      triggeredByUserId: from,
    });
  }
}

async function getOrgOwner(orgId: string): Promise<string> {
  const owner = await prisma.user.findFirst({
    where: { organizationId: orgId, role: "OWNER" },
    select: { id: true },
  });
  return owner!.id;
}
