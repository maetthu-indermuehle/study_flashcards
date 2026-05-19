/**
 * GET /api/export/deck/[deckId]/diff
 *
 * Returns only new and changed cards as a downloadable import-compatible JSON file.
 *
 * - New cards:     originalId IS NULL (created inside the app, not from a JSON file).
 * - Changed cards: have at least one CardRevision (edited after the original import).
 *
 * The output can be dropped into data/questions/ and re-imported to update the
 * seed question bank for future deployments.
 *
 * Requires EDITOR role. The deck must belong to the requesting user.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getDiffCardsForDeck } from "@/lib/export/queries";
import { formatCardsAsJson } from "@/lib/export/json-formatter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const session = await readSessionCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(session.role, "EDITOR")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { deckId } = await params;

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, createdByUserId: session.userId },
    select: { name: true },
  });
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await getDiffCardsForDeck(deckId);
  const json = formatCardsAsJson(deck.name, cards);
  const filename = `${deck.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_diff.json`;

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
