/**
 * POST /api/study/review
 *
 * Records the user's rating for a card and updates their CardProgress via SM-2.
 *
 * Request body: { cardId: string, rating: "WRONG"|"HARD"|"GOOD"|"EASY", responseMs?: number }
 * Response:     { ok: true, dueAt: string, intervalDays: number }
 *
 * Both the Review row (immutable history) and the CardProgress upsert are
 * written in a single transaction so a partial failure leaves no orphaned data.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/session/cookies";
import { computeNextProgress } from "@/lib/study/sm2";
import { ReviewRating } from "../../../../generated/prisma/enums";

const bodySchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(["WRONG", "HARD", "GOOD", "EASY"]),
  responseMs: z.number().int().positive().optional(),
});

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

  const { cardId, rating, responseMs } = parsed.data;
  const userId = session.userId;
  const ratingEnum = ReviewRating[rating];

  // Load existing progress (null = first review of this card)
  const existing = await prisma.cardProgress.findUnique({
    where: { userId_cardId: { userId, cardId } },
    select: {
      intervalDays: true,
      ease: true,
      lapses: true,
      reviewCount: true,
    },
  });

  const update = computeNextProgress(existing, ratingEnum);

  await prisma.$transaction([
    // Immutable review history row
    prisma.review.create({
      data: {
        userId,
        cardId,
        rating: ratingEnum,
        answeredCorrectly: rating !== "WRONG",
        responseMs: responseMs ?? null,
      },
    }),
    // Current progress state (upsert)
    prisma.cardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      create: {
        userId,
        cardId,
        dueAt: update.dueAt,
        lastReviewedAt: new Date(),
        intervalDays: update.intervalDays,
        ease: update.ease,
        lapses: update.lapses,
        reviewCount: update.reviewCount,
        lastRating: update.lastRating,
      },
      update: {
        dueAt: update.dueAt,
        lastReviewedAt: new Date(),
        intervalDays: update.intervalDays,
        ease: update.ease,
        lapses: update.lapses,
        reviewCount: update.reviewCount,
        lastRating: update.lastRating,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    dueAt: update.dueAt.toISOString(),
    intervalDays: update.intervalDays,
  });
}
