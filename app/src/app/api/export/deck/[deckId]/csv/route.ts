/**
 * GET /api/export/deck/[deckId]/csv
 *
 * Returns all cards in the deck as a downloadable CSV file for spreadsheet review.
 * Requires EDITOR role. The deck must belong to the requesting user.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getCardsForDeck } from "@/lib/export/queries";
import { formatCardsAsCsv } from "@/lib/export/csv-formatter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const session = await readSessionCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(session.role, "EDITOR")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { deckId } = await params;
  const tagIds = (req.nextUrl.searchParams.get("tagIds") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, createdByUserId: session.userId },
    select: { name: true },
  });
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await getCardsForDeck(deckId, tagIds);
  const csv = formatCardsAsCsv(deck.name, cards);
  const filename = `${deck.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
