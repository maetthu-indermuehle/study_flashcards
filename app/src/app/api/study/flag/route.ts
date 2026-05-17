/**
 * POST /api/study/flag
 *
 * Sets, updates, or removes the "flagged" tag on a card.
 *
 * - Sending { cardId, note } when not flagged → creates the flag with the note.
 * - Sending { cardId, note } when already flagged → updates the note.
 * - Sending { cardId, unflag: true } → removes the flag entirely.
 *
 * The flag is stored as a global Tag { name: "flagged", type: CUSTOM } linked
 * via CardTag.note — no schema migration required beyond the note column.
 *
 * Request body: { cardId: string, note?: string, unflag?: boolean }
 * Response:     { flagged: boolean, note: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/session/cookies";
import { TagType } from "../../../../generated/prisma/enums";

const bodySchema = z.object({
  cardId: z.string().min(1),
  note: z.string().max(1000).optional(),
  unflag: z.boolean().optional(),
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

  const { cardId, note, unflag } = parsed.data;

  // Ensure the "flagged" tag exists
  const tag = await prisma.tag.upsert({
    where: { name_type: FLAG_TAG },
    update: {},
    create: FLAG_TAG,
    select: { id: true },
  });

  const existingLink = await prisma.cardTag.findUnique({
    where: { cardId_tagId: { cardId, tagId: tag.id } },
    select: { note: true },
  });

  if (unflag) {
    if (existingLink) {
      await prisma.cardTag.delete({
        where: { cardId_tagId: { cardId, tagId: tag.id } },
      });
    }
    return NextResponse.json({ flagged: false, note: null });
  }

  // Upsert the CardTag with the note
  const trimmedNote = note?.trim() || null;
  await prisma.cardTag.upsert({
    where: { cardId_tagId: { cardId, tagId: tag.id } },
    update: { note: trimmedNote },
    create: { cardId, tagId: tag.id, note: trimmedNote },
  });

  return NextResponse.json({ flagged: true, note: trimmedNote });
}
