// apps/web/app/api/users/profile/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

const updateSchema = z.object({
  name:  z.string().min(2).optional(),
  phone: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const ctx  = getAuthContext(req);
    const body = updateSchema.parse(await req.json());

    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data:  body,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return Response.json({ user });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
