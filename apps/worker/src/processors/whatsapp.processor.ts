// apps/worker/src/processors/whatsapp.processor.ts
import { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_ID}/messages`;

export async function handleWhatsAppJob(job: Job) {
  const data = job.data as {
    messageId?: string;
    to?: string;
    body?: string;
    orgId?: string;
    campaignId?: string;
  };

  // Path A: dispatch a pre-created message record
  if (data.messageId) {
    await dispatchStoredMessage(data.messageId);
    return;
  }

  // Path B: broadcast job — create record then send
  if (data.to && data.body && data.orgId) {
    const msg = await prisma.message.create({
      data: {
        channel:        "WHATSAPP",
        direction:      "OUTBOUND",
        to:             data.to,
        from:           process.env.WA_PHONE_NUMBER ?? "",
        body:           data.body,
        status:         "PENDING",
        organizationId: data.orgId,
        campaignId:     data.campaignId ?? null,
      },
    });
    await dispatchStoredMessage(msg.id);

    // Update campaign stats
    if (data.campaignId) {
      await prisma.$executeRaw`
        UPDATE campaigns
        SET stats = jsonb_set(stats, '{sent}', (COALESCE((stats->>'sent')::int, 0) + 1)::text::jsonb)
        WHERE id = ${data.campaignId}
      `;
    }
  }
}

async function dispatchStoredMessage(messageId: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error(`Message ${messageId} not found`);
  if (msg.status === "SENT" || msg.status === "DELIVERED") return;

  // Find org's WA token from settings
  const org = await prisma.organization.findUnique({
    where:  { id: msg.organizationId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, string> | null;
  const token    = settings?.waToken ?? process.env.WA_TOKEN ?? "";

  const res = await fetch(WA_API_URL, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type:    "individual",
      to:                msg.to,
      type:              "text",
      text:              { preview_url: false, body: msg.body },
    }),
  });

  const json = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?:    { message: string; code: number };
  };

  if (!res.ok || json.error) {
    await prisma.message.update({
      where: { id: messageId },
      data:  { status: "FAILED", metadata: { error: json.error } },
    });
    throw new Error(`WA API error: ${json.error?.message ?? res.status}`);
  }

  await prisma.message.update({
    where: { id: messageId },
    data:  {
      status:     "SENT",
      sentAt:     new Date(),
      externalId: json.messages?.[0]?.id ?? null,
    },
  });
}
