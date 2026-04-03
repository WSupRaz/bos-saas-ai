// apps/web/services/email.service.ts
import prisma from "@/lib/db";
import { emailQueue } from "@/lib/queues";
import { interpolate } from "./whatsapp.service";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  orgId: string;
  leadId?: string;
  campaignId?: string;
  scheduledAt?: Date;
}

export class EmailService {
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY ?? "";
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "noreply@bosapp.com";
    this.fromName = process.env.EMAIL_FROM_NAME ?? "BOS Platform";
  }

  /** Send or schedule a single email */
  async send(opts: SendEmailOptions) {
    const msg = await prisma.message.create({
      data: {
        channel: "EMAIL",
        direction: "OUTBOUND",
        to: opts.to,
        from: this.fromAddress,
        body: opts.html,
        metadata: { subject: opts.subject },
        status: "PENDING",
        scheduledAt: opts.scheduledAt ?? null,
        organizationId: opts.orgId,
        leadId: opts.leadId ?? null,
        campaignId: opts.campaignId ?? null,
      },
    });

    if (opts.scheduledAt && opts.scheduledAt > new Date()) {
      const delay = opts.scheduledAt.getTime() - Date.now();
      await emailQueue.add("send-email", { messageId: msg.id }, { delay });
      await prisma.message.update({
        where: { id: msg.id },
        data: { status: "QUEUED" },
      });
    } else {
      await emailQueue.add("send-email", { messageId: msg.id });
    }

    return msg;
  }

  /** Dispatch a stored email via SendGrid — called by the worker */
  async dispatch(messageId: string): Promise<void> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.status === "SENT") return;

    const meta = msg.metadata as { subject?: string } | null;

    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: this.fromAddress, name: this.fromName },
          subject: meta?.subject ?? "(no subject)",
          content: [{ type: "text/html", value: msg.body }],
          tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`SendGrid error ${res.status}: ${text}`);
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (err) {
      console.error(`[Email] Failed to send message ${messageId}:`, err);
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "FAILED", metadata: { ...meta, error: String(err) } },
      });
      throw err;
    }
  }

  /** Send a campaign email to a list of recipients */
  async broadcast(params: {
    orgId: string;
    campaignId: string;
    recipients: Array<{ email: string; name?: string; variables?: Record<string, string> }>;
    subject: string;
    bodyTemplate: string;
  }) {
    const jobs = params.recipients.map((r, i) => {
      const html = interpolate(params.bodyTemplate, {
        name: r.name ?? "",
        email: r.email,
        ...(r.variables ?? {}),
      });
      return emailQueue.add(
        "send-email",
        {
          to: r.email,
          subject: params.subject,
          html,
          orgId: params.orgId,
          campaignId: params.campaignId,
        },
        { delay: i * 200 } // 200ms stagger
      );
    });

    await Promise.all(jobs);

    await prisma.campaign.update({
      where: { id: params.campaignId },
      data: {
        status: "RUNNING",
        sentAt: new Date(),
        stats: { total: params.recipients.length, sent: 0, delivered: 0, failed: 0 },
      },
    });
  }

  /** Convenience: send a transactional email without persisting as a campaign */
  async sendTransactional(opts: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: this.fromAddress, name: this.fromName },
        subject: opts.subject,
        content: [{ type: "text/html", value: opts.html }],
      }),
    });
  }
}
