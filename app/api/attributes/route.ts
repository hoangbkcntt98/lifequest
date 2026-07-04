import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookie } from "@/lib/auth";

const createAttributeSchema = z.object({
  name: z.string().min(1).max(30),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
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

    const attributes = await prisma.attribute.findMany({
      where: {
        userId: authUser.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      attributes,
    });
  } catch (error) {
    console.error("GET_ATTRIBUTES_ERROR", error);

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

    const parsed = createAttributeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid attribute data.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, icon, color } = parsed.data;

    const attribute = await prisma.attribute.create({
      data: {
        userId: authUser.userId,
        name,
        icon,
        color,
      },
    });

    return NextResponse.json(
      {
        message: "Attribute created successfully.",
        attribute,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("CREATE_ATTRIBUTE_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          message: "Attribute name already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}