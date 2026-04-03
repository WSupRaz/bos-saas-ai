// apps/web/services/whatsapp.service.ts
import prisma from "@/lib/db";
import { messageQueue } from "@/lib/queues";

interface SendOptions {
  to: string;
  body: string;
  orgId: string;
  scheduledAt?: Date;
  campaignId?: string;
  leadId?: string;
}

export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumber: string;

  constructor() {
    this.apiUrl = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_ID}/messages`;
    this.token = process.env.WA_TOKEN ?? "";
    this.phoneNumber = process.env.WA_PHONE_NUMBER ?? "";
  }

  /** Send or schedule a single WhatsApp message */
  async send(opts: SendOptions) {
    // Always persist the message in DB first
    const msg = await prisma.message.create({
      data: {
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        to: opts.to,
        from: this.phoneNumber,
        body: opts.body,
        status: "PENDING",
        scheduledAt: opts.scheduledAt ?? null,
        organizationId: opts.orgId,
        leadId: opts.leadId ?? null,
        campaignId: opts.campaignId ?? null,
      },
    });

    if (opts.scheduledAt && opts.scheduledAt > new Date()) {
      // Schedule via BullMQ with delay
      const delay = opts.scheduledAt.getTime() - Date.now();
      await messageQueue.add(
        "send-whatsapp",
        { messageId: msg.id },
        { delay, jobId: `wa-${msg.id}` }
      );
      await prisma.message.update({
        where: { id: msg.id },
        data: { status: "QUEUED" },
      });
    } else {
      // Send immediately via worker queue (non-blocking)
      await messageQueue.add("send-whatsapp", { messageId: msg.id });
    }

    return msg;
  }

  /** Dispatch a stored message via Meta API — called by the worker */
  async dispatch(messageId: string): Promise<void> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.status === "SENT" || msg.status === "DELIVERED") return;

    try {
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: msg.to,
          type: "text",
          text: { preview_url: false, body: msg.body },
        }),
      });

      const json = (await res.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          externalId: json.messages?.[0]?.id,
        },
      });
    } catch (err) {
      console.error(`[WhatsApp] Failed to send message ${messageId}:`, err);
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "FAILED",
          metadata: { error: String(err) },
        },
      });
      throw err;
    }
  }

  /** Broadcast to many recipients — staggers sends to avoid rate limits */
  async broadcast(params: {
    orgId: string;
    campaignId: string;
    recipients: Array<{ phone: string; variables?: Record<string, string> }>;
    bodyTemplate: string;
  }) {
    const jobs = params.recipients.map((r, i) => {
      const body = interpolate(params.bodyTemplate, r.variables ?? {});
      return messageQueue.add(
        "send-whatsapp",
        {
          to: r.phone,
          body,
          orgId: params.orgId,
          campaignId: params.campaignId,
        },
        { delay: i * 1500 } // 1.5 sec stagger → ~40 msg/min well within Meta limits
      );
    });

    await Promise.all(jobs);

    await prisma.campaign.update({
      where: { id: params.campaignId },
      data: {
        status: "RUNNING",
        sentAt: new Date(),
        stats: {
          total: params.recipients.length,
          sent: 0,
          delivered: 0,
          failed: 0,
        },
      },
    });
  }

  /** Mark inbound delivery/read status updates from webhook */
  async handleStatusUpdate(externalId: string, status: string) {
    const statusMap: Record<string, string> = {
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    };

    const mapped = statusMap[status];
    if (!mapped) return;

    await prisma.message.updateMany({
      where: { externalId },
      data: {
        status: mapped as never,
        ...(mapped === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(mapped === "READ" ? { readAt: new Date() } : {}),
      },
    });
  }
}

export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
