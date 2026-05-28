// apps/web/app/api/health/route.ts
import prisma from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", timestamp: new Date().toISOString(), db: "connected" },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { status: "degraded", timestamp: new Date().toISOString(), db: "disconnected" },
      { status: 503 }
    );
  }
}
