// apps/worker/src/processors/email.processor.ts
import { Job } from "bullmq";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handleEmailJob(job: Job) {
  const data = job.data as {
    messageId?: string;
    to?:        string;
    subject?:   string;
    html?:      string;
    orgId?:     string;
    campaignId?: string;
  };

  if (data.messageId) {
    await dispatchStoredEmail(data.messageId);
    return;
  }

  if (data.to && data.html && data.orgId) {
    const msg = await prisma.message.create({
      data: {
        channel:        "EMAIL",
        direction:      "OUTBOUND",
        to:             data.to,
        from:           process.env.EMAIL_FROM_ADDRESS ?? "",
        body:           data.html,
        metadata:       { subject: data.subject ?? "" },
        status:         "PENDING",
        organizationId: data.orgId,
        campaignId:     data.campaignId ?? null,
      },
    });
    await dispatchStoredEmail(msg.id);
  }
}

async function dispatchStoredEmail(messageId: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.status === "SENT") return;

  const meta    = msg.metadata as { subject?: string } | null;
  const subject = meta?.subject ?? "(no subject)";

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from:             {
        email: process.env.EMAIL_FROM_ADDRESS ?? "noreply@bosapp.com",
        name:  process.env.EMAIL_FROM_NAME    ?? "BOS",
      },
      subject,
      content: [{ type: "text/html", value: msg.body }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    await prisma.message.update({
      where: { id: messageId },
      data:  { status: "FAILED", metadata: { ...meta, error: txt } },
    });
    throw new Error(`SendGrid ${res.status}: ${txt}`);
  }

  await prisma.message.update({
    where: { id: messageId },
    data:  { status: "SENT", sentAt: new Date() },
  });
}
