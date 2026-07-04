import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayMissionSummary } from "@/lib/notifications/missions";
import { sendPushToSubscriptions } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {},
        },
      },
      select: {
        id: true,
        email: true,
        pushSubscriptions: true,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const summary = await getTodayMissionSummary(user.id);
      const title =
        summary.remaining === 0
          ? "LifeQuest: all clear today"
          : `LifeQuest: ${summary.remaining} missions left`;
      const body =
        summary.remaining === 0
          ? "Bạn đã hoàn thành toàn bộ mission hôm nay."
          : `Bạn còn ${summary.remaining}/${summary.total} mission chưa làm hôm nay.`;

      const result = await sendPushToSubscriptions(user.pushSubscriptions, {
        title,
        body,
        url: "/dashboard",
      });
      sent += result.sent;
      failed += result.failed;
    }

    return NextResponse.json({
      users: users.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("PUSH_DAILY_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
