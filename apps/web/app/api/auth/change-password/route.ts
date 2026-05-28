// apps/web/app/api/auth/change-password/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx  = getAuthContext(req);
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { passwordHash: true },
    });

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return Response.json({ error: "Current password is incorrect" }, { status: 400 });

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash } });

    return Response.json({ message: "Password updated successfully" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
