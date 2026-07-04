import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

const createAttributeSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(30),
  value: z.number().int().min(0).default(0),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const attributes = await prisma.attribute.findMany({
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
      _count: {
        select: {
          missions: true,
        },
      },
    },
  });

  return NextResponse.json({ attributes });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = createAttributeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid attribute data." },
      { status: 400 }
    );
  }

  try {
    const attribute = await prisma.attribute.create({
      data: parsed.data,
    });

    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { message: "Attribute name already exists for this user." },
        { status: 409 }
      );
    }

    throw error;
  }
}
