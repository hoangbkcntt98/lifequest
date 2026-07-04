import { NextRequest, NextResponse } from "next/server";
import { MissionDifficulty, MissionRepeatType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { getMissionRewardByDifficulty } from "@/lib/mission-rewards";

const updateMissionSchema = z.object({
  attributeId: z.string().min(1).optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  difficulty: z.nativeEnum(MissionDifficulty).optional(),
  repeatType: z.nativeEnum(MissionRepeatType).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    const mission = await prisma.mission.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
      include: {
        attribute: true,
        logs: {
          orderBy: {
            completedDate: "desc",
          },
          take: 30,
        },
      },
    });

    if (!mission) {
      return NextResponse.json(
        {
          message: "Mission not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mission,
    });
  } catch (error) {
    console.error("GET_MISSION_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const body = await request.json();

    const parsed = updateMissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid mission data.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingMission = await prisma.mission.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
    });

    if (!existingMission) {
      return NextResponse.json(
        {
          message: "Mission not found.",
        },
        { status: 404 }
      );
    }

    const data = parsed.data;

    if (data.attributeId) {
      const attribute = await prisma.attribute.findFirst({
        where: {
          id: data.attributeId,
          userId: authUser.userId,
        },
      });

      if (!attribute) {
        return NextResponse.json(
          {
            message: "Attribute not found.",
          },
          { status: 404 }
        );
      }
    }

    const updateData: any = {
      ...data,
    };

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    if (data.difficulty) {
      const reward = getMissionRewardByDifficulty(data.difficulty);

      updateData.expReward = reward.expReward;
      updateData.goldReward = reward.goldReward;
      updateData.statReward = reward.statReward;
    }

    const mission = await prisma.mission.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        attribute: true,
      },
    });

    return NextResponse.json({
      message: "Mission updated successfully.",
      mission,
    });
  } catch (error) {
    console.error("UPDATE_MISSION_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    const existingMission = await prisma.mission.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
    });

    if (!existingMission) {
      return NextResponse.json(
        {
          message: "Mission not found.",
        },
        { status: 404 }
      );
    }

    await prisma.mission.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Mission deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_MISSION_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}