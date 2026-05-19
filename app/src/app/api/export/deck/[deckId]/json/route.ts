/**
 * GET /api/export/deck/[deckId]/json
 *
 * Returns all cards in the deck as a downloadable import-compatible JSON file.
 * Requires EDITOR role. The deck must belong to the requesting user.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getCardsForDeck } from "@/lib/export/queries";
import { formatCardsAsJson } from "@/lib/export/json-formatter";

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
  const json = formatCardsAsJson(deck.name, cards);
  const filename = `${deck.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.json`;

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
