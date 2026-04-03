// apps/web/app/api/auth/forgot-password/route.ts
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/db";
import { EmailService } from "@/services/email.service";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent user enumeration
    if (!user) {
      return Response.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    const em = new EmailService();
    await em.sendTransactional({
      to: email,
      subject: "Reset your BOS password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return Response.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("[ForgotPassword]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
