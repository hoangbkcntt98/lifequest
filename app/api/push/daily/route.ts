import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getTodayMissionSummary } from "@/lib/notifications/missions";

export const runtime = "nodejs";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@lifequest.local";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    configureWebPush();

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

      const payload = JSON.stringify({
        title,
        body,
        url: "/dashboard",
      });

      for (const subscription of user.pushSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          sent += 1;
        } catch (error) {
          failed += 1;

          const statusCode = (error as { statusCode?: number }).statusCode;

          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: {
                id: subscription.id,
              },
            });
          } else {
            console.error("PUSH_SEND_ERROR", user.email, error);
          }
        }
      }
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
