// apps/web/app/api/auth/reset-password/route.ts
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db";

const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const { token, password } = schema.parse(await req.json());

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return Response.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
      // Invalidate all existing sessions
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    return Response.json({ message: "Password updated successfully. Please log in." });
  } catch (err) {
    console.error("[ResetPassword]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
