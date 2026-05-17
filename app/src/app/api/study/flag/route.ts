/**
 * POST /api/study/flag
 *
 * Toggles the "flagged" tag on a card for the authenticated user.
 * Flagged cards can be queried later for review and correction.
 *
 * The flag is stored as a global Tag { name: "flagged", type: CUSTOM }
 * linked via CardTag — no schema migration required.
 *
 * Request body: { cardId: string }
 * Response:     { flagged: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/session/cookies";
import { TagType } from "../../../../generated/prisma/enums";

const bodySchema = z.object({
  cardId: z.string().min(1),
});

const FLAG_TAG = { name: "flagged", type: TagType.CUSTOM };

export async function POST(request: NextRequest) {
  const session = await readSessionCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { cardId } = parsed.data;

  // Check current flag state
  const flagTag = await prisma.tag.findUnique({
    where: { name_type: FLAG_TAG },
    select: { id: true },
  });

  const existingLink = flagTag
    ? await prisma.cardTag.findUnique({
        where: { cardId_tagId: { cardId, tagId: flagTag.id } },
        select: { cardId: true },
      })
    : null;

  if (existingLink) {
    // Already flagged — remove the flag
    await prisma.cardTag.delete({
      where: { cardId_tagId: { cardId, tagId: flagTag!.id } },
    });
    return NextResponse.json({ flagged: false });
  }

  // Not flagged — add the flag (upsert tag, then create link)
  const tag = await prisma.tag.upsert({
    where: { name_type: FLAG_TAG },
    update: {},
    create: FLAG_TAG,
    select: { id: true },
  });

  await prisma.cardTag.create({ data: { cardId, tagId: tag.id } });

  return NextResponse.json({ flagged: true });
}
