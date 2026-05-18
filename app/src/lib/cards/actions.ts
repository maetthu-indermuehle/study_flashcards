"use server";

/**
 * @module lib/cards/actions
 * Server Actions for card create, update, archive, and delete.
 *
 * Every action re-validates the session internally — never trust userId
 * from the client. Each write is preceded by a CardRevision snapshot so
 * the full edit history is preserved.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/permissions";
import { TagType } from "@/generated/prisma/enums";
import type { CardFormData } from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Authenticates the current request and requires EDITOR role.
 * Card create/edit/delete actions are EDITOR-only.
 */
async function requireEditor(): Promise<{ userId: string }> {
  const { userId } = await requireRole("EDITOR");
  return { userId };
}

/** Returns the user's deck ID or throws. */
async function requireDeck(userId: string): Promise<string> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (!deck) throw new Error("No deck found for user");
  return deck.id;
}

/**
 * Verifies that the card belongs to the user's deck and returns the card ID.
 * Throws if the card is not found or not owned by the user.
 */
async function requireCardOwnership(
  cardId: string,
  userId: string,
): Promise<string> {
  const deckId = await requireDeck(userId);
  const card = await prisma.card.findFirst({
    where: { id: cardId, deckId },
    select: { id: true },
  });
  if (!card) throw new Error("Card not found");
  return card.id;
}

/**
 * Reads the current card state and writes a CardRevision snapshot.
 * Must be called inside a Prisma transaction or before the update.
 */
async function writeRevision(
  cardId: string,
  userId: string,
  reason: string | null,
): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      question: true,
      answer: true,
      explanation: true,
      difficulty: true,
      status: true,
      choices: {
        select: { text: true, isCorrect: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      tags: {
        select: {
          note: true,
          tag: { select: { name: true, type: true } },
        },
      },
    },
  });
  if (!card) return;

  const flagCt = card.tags.find(
    (ct) => ct.tag.name === "flagged" && ct.tag.type === TagType.CUSTOM,
  );

  const snapshot = {
    question: card.question,
    answer: card.answer,
    explanation: card.explanation,
    difficulty: card.difficulty,
    status: card.status,
    choices: card.choices,
    tags: card.tags.map((ct) => ({ name: ct.tag.name, type: ct.tag.type })),
    flagNote: flagCt?.note ?? null,
  };

  await prisma.cardRevision.create({
    data: {
      cardId,
      editedByUserId: userId,
      reason,
      snapshot,
    },
  });
}

/**
 * Applies tag changes to a card within a transaction context.
 * Preserves the flagged CardTag; replaces all others with the provided set.
 * Creates new tags as needed (upsert by name+type).
 */
async function applyTags(
  cardId: string,
  tagIds: string[],
  newTags: { name: string; type: TagType }[],
): Promise<void> {
  // Create (or find) new tags by name+type.
  const createdTagIds = await Promise.all(
    newTags.map(async (t) => {
      const tag = await prisma.tag.upsert({
        where: { name_type: { name: t.name, type: t.type } },
        create: { name: t.name, type: t.type },
        update: {},
      });
      return tag.id;
    }),
  );

  const allTagIds = [...new Set([...tagIds, ...createdTagIds])];

  // Find the flagged tag so we can preserve its CardTag row.
  const flagTag = await prisma.tag.findUnique({
    where: { name_type: { name: "flagged", type: TagType.CUSTOM } },
    select: { id: true },
  });

  // Delete all non-flagged card-tag rows.
  await prisma.cardTag.deleteMany({
    where: {
      cardId,
      ...(flagTag ? { NOT: { tagId: flagTag.id } } : {}),
    },
  });

  // Insert the new set, skipping duplicates (the flagged row if it snuck in).
  if (allTagIds.length > 0) {
    await prisma.cardTag.createMany({
      data: allTagIds.map((tagId) => ({ cardId, tagId })),
      skipDuplicates: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Public Server Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new card in the user's deck.
 * On success, redirects to the new card's detail page.
 */
export async function createCard(data: CardFormData): Promise<ActionResult> {
  try {
    const { userId } = await requireEditor();
    const deckId = await requireDeck(userId);

    const card = await prisma.card.create({
      data: {
        deckId,
        createdByUserId: userId,
        type: data.type,
        question: data.question.trim(),
        answer: data.answer.trim(),
        explanation: data.explanation.trim() || null,
        difficulty: data.difficulty,
        status: data.status,
      },
      select: { id: true },
    });

    // Choices (MC only).
    if (data.type === "MULTIPLE_CHOICE" && data.choices.length > 0) {
      await prisma.choice.createMany({
        data: data.choices.map((c, i) => ({
          cardId: card.id,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          sortOrder: c.sortOrder ?? i,
        })),
      });
    }

    // Tags.
    await applyTags(card.id, data.tagIds, data.newTags);

    // Reference.
    if (data.reference && data.reference.label.trim()) {
      await prisma.sourceReference.create({
        data: {
          cardId: card.id,
          label: data.reference.label.trim(),
          url: data.reference.url.trim() || null,
          documentName: data.reference.documentName.trim() || null,
          page: data.reference.page ? parseInt(data.reference.page, 10) : null,
          section: data.reference.section.trim() || null,
          notes: data.reference.notes.trim() || null,
        },
      });
    }

    revalidatePath("/cards");
  } catch (e) {
    return { success: false, error: String(e) };
  }

  // redirect() must be called outside try/catch.
  redirect("/cards");
}

/**
 * Updates an existing card, writing a CardRevision snapshot first.
 */
export async function updateCard(
  cardId: string,
  data: CardFormData,
  reason: string | null = null,
): Promise<ActionResult> {
  try {
    const { userId } = await requireEditor();
    await requireCardOwnership(cardId, userId);

    // Snapshot the current state before any changes.
    await writeRevision(cardId, userId, reason);

    // Update core fields.
    await prisma.card.update({
      where: { id: cardId },
      data: {
        type: data.type,
        question: data.question.trim(),
        answer: data.answer.trim(),
        explanation: data.explanation.trim() || null,
        difficulty: data.difficulty,
        status: data.status,
      },
    });

    // Replace choices (MC). For OA cards, delete any stale choices.
    await prisma.choice.deleteMany({ where: { cardId } });
    if (data.type === "MULTIPLE_CHOICE" && data.choices.length > 0) {
      await prisma.choice.createMany({
        data: data.choices.map((c, i) => ({
          cardId,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          sortOrder: c.sortOrder ?? i,
        })),
      });
    }

    // Replace tags (preserving the flagged tag).
    await applyTags(cardId, data.tagIds, data.newTags);

    // Upsert the canonical reference if provided.
    if (data.reference && data.reference.label.trim()) {
      if (data.reference.id) {
        await prisma.sourceReference.update({
          where: { id: data.reference.id },
          data: {
            label: data.reference.label.trim(),
            url: data.reference.url.trim() || null,
            documentName: data.reference.documentName.trim() || null,
            page: data.reference.page
              ? parseInt(data.reference.page, 10)
              : null,
            section: data.reference.section.trim() || null,
            notes: data.reference.notes.trim() || null,
          },
        });
      } else {
        await prisma.sourceReference.create({
          data: {
            cardId,
            label: data.reference.label.trim(),
            url: data.reference.url.trim() || null,
            documentName: data.reference.documentName.trim() || null,
            page: data.reference.page
              ? parseInt(data.reference.page, 10)
              : null,
            section: data.reference.section.trim() || null,
            notes: data.reference.notes.trim() || null,
          },
        });
      }
    }

    revalidatePath("/cards");
    revalidatePath(`/cards/${cardId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Archives a card (sets status to ARCHIVED). Writes a revision snapshot.
 */
export async function archiveCard(cardId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireEditor();
    await requireCardOwnership(cardId, userId);

    await writeRevision(cardId, userId, "archived");
    await prisma.card.update({
      where: { id: cardId },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/cards");
    revalidatePath(`/cards/${cardId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Hard-deletes a card. Only allowed for DRAFT cards with no review history.
 */
export async function deleteCard(cardId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireEditor();
    await requireCardOwnership(cardId, userId);

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { status: true, _count: { select: { reviews: true } } },
    });

    if (!card) return { success: false, error: "Card not found" };
    if (card.status !== "DRAFT") {
      return {
        success: false,
        error: "Only DRAFT cards can be deleted. Archive published cards instead.",
      };
    }
    if (card._count.reviews > 0) {
      return {
        success: false,
        error: "Cannot delete a card that has review history.",
      };
    }

    await prisma.card.delete({ where: { id: cardId } });

    revalidatePath("/cards");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Saves edits from the flagged queue and removes the flag.
 * Used by FlaggedQueue's "Save & clear flag" button.
 */
export async function saveFlaggedCard(
  cardId: string,
  data: CardFormData,
): Promise<ActionResult> {
  const result = await updateCard(cardId, data, "flagged edit");
  if (!result.success) return result;

  try {
    const { userId } = await requireEditor();
    void userId; // auth already checked in updateCard

    // Remove the flagged tag.
    const flagTag = await prisma.tag.findUnique({
      where: { name_type: { name: "flagged", type: TagType.CUSTOM } },
      select: { id: true },
    });
    if (flagTag) {
      await prisma.cardTag.deleteMany({
        where: { cardId, tagId: flagTag.id },
      });
    }

    revalidatePath("/cards/flagged");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
