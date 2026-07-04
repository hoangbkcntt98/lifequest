import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { getTodayInTokyoDateOnly } from "@/lib/date";
import { calculateCurrentStreakFromLogs } from "@/lib/streak";
import { getDailyQuoteIndex } from "@/lib/quote";
import { getSelectedCharacter, getUserCharacterCount } from "@/lib/character/session";

export async function GET() {
  try {
    const authUser = await getCurrentUserFromCookie();

    if (!authUser) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const today = getTodayInTokyoDateOnly();

    const character = await getSelectedCharacter(authUser.userId);

    if (!character) {
      const characterCount = await getUserCharacterCount(authUser.userId);

      return NextResponse.json(
        {
          message:
            characterCount > 0
              ? "Please select a character."
              : "Character not found.",
          needCreateCharacter: characterCount === 0,
          needSelectCharacter: characterCount > 0,
        },
        { status: 404 }
      );
    }

    const attributes = await prisma.attribute.findMany({
      where: {
        userId: authUser.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const missions = await prisma.mission.findMany({
      where: {
        userId: authUser.userId,
        isActive: true,
        OR: [
          {
            startDate: null,
          },
          {
            startDate: {
              lte: today,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                endDate: null,
              },
              {
                endDate: {
                  gte: today,
                },
              },
            ],
          },
        ],
      },
      include: {
        attribute: true,
        logs: {
          where: {
            completedDate: today,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const todayMissions = missions.map((mission) => {
      const completed = mission.logs.length > 0;

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        difficulty: mission.difficulty,
        repeatType: mission.repeatType,
        expReward: mission.expReward,
        goldReward: mission.goldReward,
        statReward: mission.statReward,
        isActive: mission.isActive,
        completed,
        attribute: {
          id: mission.attribute.id,
          name: mission.attribute.name,
          icon: mission.attribute.icon,
          color: mission.attribute.color,
        },
      };
    });

    const recentLogs = await prisma.missionLog.findMany({
      where: {
        userId: authUser.userId,
      },
      select: {
        completedDate: true,
      },
      orderBy: {
        completedDate: "desc",
      },
      take: 365,
    });

    const streak = calculateCurrentStreakFromLogs(recentLogs);

    const quoteCount = await prisma.dailyQuote.count();

    let quote = null;

    if (quoteCount > 0) {
      const quoteIndex = getDailyQuoteIndex(today, quoteCount);

      const quotes = await prisma.dailyQuote.findMany({
        orderBy: {
          createdAt: "asc",
        },
        skip: quoteIndex,
        take: 1,
      });

      quote = quotes[0] ?? null;
    }

    const requiredExp = character.level * 100;

    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        className: character.className,
        level: character.level,
        exp: character.exp,
        requiredExp,
        gold: character.gold,
        avatarUrl: character.avatarUrl,
      },
      attributes,
      todayMissions,
      streak,
      quote,
      summary: {
        totalMissionsToday: todayMissions.length,
        completedMissionsToday: todayMissions.filter((mission) => mission.completed)
          .length,
        completionRate:
          todayMissions.length === 0
            ? 0
            : Math.round(
                (todayMissions.filter((mission) => mission.completed).length /
                  todayMissions.length) *
                  100
              ),
      },
    });
  } catch (error) {
    console.error("DASHBOARD_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}
