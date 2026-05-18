// Seed script: creates the default user, the Canadian PPL deck, and imports
// all question cards from $QUESTIONS_DIR (default: /data/questions).
//
// Run via: npx prisma db seed
//
// Credentials come from environment variables so nothing sensitive lives in
// source code. In local development these are set in docker-compose.yml.
// The script is idempotent — safe to re-run against an existing database.
// Cards are upserted by sourceId so re-seeding refreshes content without
// creating duplicates.

// dotenv/config must be first so DATABASE_URL is set before the Prisma
// client singleton (imported transitively via importCards) creates its pool.
import "dotenv/config";

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";
import { parseJsonCards } from "../src/lib/importer/json-parser";
import { validate } from "../src/lib/importer/validator";
import { importCards } from "../src/lib/importer/import-service";

async function main() {
  // -------------------------------------------------------------------------
  // User
  // -------------------------------------------------------------------------

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD must be set before running the seed.",
    );
  }

  const passwordHash = await hashPassword(password);

  // Upsert the seed user so re-runs are safe. The password hash is always
  // refreshed on re-seed, which is fine for a development seed user.
  // The seed user is always ADMIN — ordinary users are created via the
  // admin UI after first login.
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName: "Admin", role: "ADMIN" },
    create: {
      email,
      displayName: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded user: ${user.email} (id: ${user.id})`);

  // -------------------------------------------------------------------------
  // Deck
  // -------------------------------------------------------------------------

  // Upsert the Canadian PPL deck. There is no unique constraint on Deck.name,
  // so we look up by owner + name using findFirst and create if absent.
  const existingDeck = await prisma.deck.findFirst({
    where: { createdByUserId: user.id, name: "Canadian PPL" },
  });

  const deck = existingDeck
    ? existingDeck
    : await prisma.deck.create({
        data: {
          name: "Canadian PPL",
          description:
            "Ground school study cards for the Canadian Private Pilot Licence.",
          visibility: "PRIVATE",
          createdByUserId: user.id,
        },
      });

  console.log(`Seeded deck: "${deck.name}" (id: ${deck.id})`);

  // -------------------------------------------------------------------------
  // Cards — auto-import all JSON files from $QUESTIONS_DIR
  //
  // This is what makes the question data portable: any deployment runs the
  // seed on startup and gets all committed JSON files imported automatically.
  // The import is idempotent so re-seeding only updates changed cards.
  //
  // The directory is skipped silently when it does not exist (e.g. in CI
  // where the /data volume is not mounted) so the seed never hard-fails on
  // a missing questions directory.
  // -------------------------------------------------------------------------

  const questionsDir = process.env.QUESTIONS_DIR ?? "/data/questions";

  let jsonFiles: string[] = [];
  try {
    jsonFiles = readdirSync(questionsDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    console.log(
      `No questions directory at ${questionsDir} — skipping card import.`,
    );
  }

  if (jsonFiles.length > 0) {
    console.log(`\nImporting cards from ${questionsDir}...`);

    for (const file of jsonFiles) {
      const filePath = join(questionsDir, file);

      let cards;
      try {
        const jsonString = readFileSync(filePath, "utf-8");
        cards = parseJsonCards(jsonString);
      } catch (err) {
        console.error(
          `  SKIP  ${file}: parse error — ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      const errors = validate(cards).filter((e) => e.severity === "error");
      if (errors.length > 0) {
        console.warn(
          `  SKIP  ${file}: ${errors.length} validation error(s) — run the CLI with --verbose for details`,
        );
        continue;
      }

      try {
        const result = await importCards(cards, {
          deckName: deck.name,
          userId: user.id,
        });
        console.log(
          `  OK    ${file}: ${result.created} created, ${result.updated} updated`,
        );
      } catch (err) {
        console.error(
          `  ERROR ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
