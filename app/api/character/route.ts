import { NextRequest, NextResponse } from "next/server";
import { CharacterClass } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { DEFAULT_ATTRIBUTES } from "@/lib/default-attributes";

const createCharacterSchema = z.object({
  name: z.string().min(1).max(30),
  className: z.nativeEnum(CharacterClass).default(CharacterClass.ADVENTURER),
  avatarUrl: z.string().url().optional().nullable(),
});

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

    const character = await prisma.character.findUnique({
      where: {
        userId: authUser.userId,
      },
    });

    const attributes = await prisma.attribute.findMany({
      where: {
        userId: authUser.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      character,
      attributes,
    });
  } catch (error) {
    console.error("GET_CHARACTER_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const parsed = createCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid character data.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, className, avatarUrl } = parsed.data;

    const existingCharacter = await prisma.character.findUnique({
      where: {
        userId: authUser.userId,
      },
    });

    if (existingCharacter) {
      return NextResponse.json(
        {
          message: "Character already exists.",
        },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          userId: authUser.userId,
          name,
          className,
          avatarUrl,
        },
      });

      const attributes = await tx.attribute.createManyAndReturn({
        data: DEFAULT_ATTRIBUTES.map((attribute) => ({
          userId: authUser.userId,
          name: attribute.name,
          icon: attribute.icon,
          color: attribute.color,
        })),
      });

      return {
        character,
        attributes,
      };
    });

    return NextResponse.json(
      {
        message: "Character created successfully.",
        character: result.character,
        attributes: result.attributes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_CHARACTER_ERROR", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}