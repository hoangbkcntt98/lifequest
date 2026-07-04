import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const subscriptions = await prisma.pushSubscription.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ subscriptions });
}
