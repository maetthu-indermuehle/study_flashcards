/**
 * @module scripts/import
 * CLI entry point for the JSON card importer.
 *
 * Reads a JSON question file, parses and validates the cards, then writes
 * them to the database. Re-running against the same file is safe — cards are
 * upserted by sourceId and choices/tags/references are replaced in place.
 *
 * Usage:
 *   npx tsx scripts/import.ts <file.json> [options]
 *
 * Options:
 *   --dry-run        Parse and validate only; do not write to the database.
 *   --force          Continue even when validation errors are present.
 *   --verbose        Print each card's sourceId as it is processed.
 *   --deck <name>    Target deck name (default: "Canadian PPL").
 *   --user <email>   Email of the deck owner (default: SEED_USER_EMAIL env var).
 *
 * @example
 * ```bash
 * # Validate without writing
 * npx tsx scripts/import.ts data/questions/met.json --dry-run
 *
 * # Import into the default deck
 * npx tsx scripts/import.ts data/questions/met.json
 *
 * # Import into a different deck, print each card processed
 * npx tsx scripts/import.ts data/questions/met.json --deck "Air Law" --verbose
 * ```
 */

// dotenv/config must be imported before any module that reads process.env
// (including the Prisma client singleton).
import "dotenv/config";

import { readFileSync } from "fs";
import { resolve } from "path";
import { parseJsonBatch } from "../src/lib/importer/json-parser";
import { validate } from "../src/lib/importer/validator";
import { importCards } from "../src/lib/importer/import-service";
import { prisma } from "../src/lib/db/client";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

/** Returns true if `--<name>` appears anywhere in the argument list. */
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/**
 * Returns the value that follows `--<name>` in the argument list, or
 * `undefined` if the option is absent or has no following token.
 */
function getOption(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

const fileArg = args.find((a) => !a.startsWith("--"));
const dryRun = hasFlag("dry-run");
const force = hasFlag("force");
const verbose = hasFlag("verbose");
const deckName = getOption("deck") ?? "Canadian PPL";
const userEmail = getOption("user") ?? process.env.SEED_USER_EMAIL;

if (!fileArg) {
  console.error("Usage: npx tsx scripts/import.ts <file.json> [options]");
  console.error("");
  console.error("  --dry-run        Validate only, do not write to the database");
  console.error("  --force          Import even when validation errors are present");
  console.error("  --verbose        Print each card's sourceId as it is processed");
  console.error('  --deck <name>    Target deck name (default: "Canadian PPL")');
  console.error("  --user <email>   Deck owner email (default: SEED_USER_EMAIL env var)");
  process.exit(1);
}

if (!userEmail) {
  console.error(
    "No user email provided. Pass --user <email> or set SEED_USER_EMAIL.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(filePath: string, email: string) {
  const absolutePath = resolve(filePath);

  // -------------------------------------------------------------------------
  // Step 1 — read and parse the file
  // -------------------------------------------------------------------------

  console.log(`Parsing ${absolutePath}...`);

  let jsonString: string;
  try {
    jsonString = readFileSync(absolutePath, "utf-8");
  } catch (err) {
    console.error(
      `Could not read file: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  let batch;
  try {
    batch = parseJsonBatch(jsonString);
  } catch (err) {
    console.error(
      `Parse error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  const cards = batch.cards;
  // Subject from the JSON wrapper takes precedence over the --deck flag.
  const resolvedDeckName = batch.subject ?? deckName;

  console.log(`  Parsed:   ${cards.length} card${cards.length !== 1 ? "s" : ""}`);
  if (batch.subject) {
    console.log(`  Subject:  ${batch.subject}`);
  }

  if (verbose) {
    for (const card of cards) {
      console.log(`    - ${card.sourceId}`);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 — validate
  // -------------------------------------------------------------------------

  const validationErrors = validate(cards);
  const errorCount = validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length;

  console.log(`  Errors:   ${errorCount}`);
  console.log(`  Warnings: ${warningCount}`);

  if (validationErrors.length > 0) {
    console.log("");
    for (const ve of validationErrors) {
      const tag = ve.severity === "error" ? "ERROR" : "WARN ";
      console.log(`  ${tag}  [${ve.sourceId}] ${ve.code}: ${ve.message}`);
    }
  }

  if (errorCount > 0 && !force) {
    console.error(
      "\nAborting due to validation errors. Pass --force to import anyway.",
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry run complete — no data written.");
    return;
  }

  // -------------------------------------------------------------------------
  // Step 3 — resolve the user
  // -------------------------------------------------------------------------

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    console.error(`User "${email}" not found in the database.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 4 — import
  // -------------------------------------------------------------------------

  console.log(`\nImporting into deck "${resolvedDeckName}"...`);

  const result = await importCards(cards, { deckName: resolvedDeckName, userId: user.id });

  console.log(
    `  Created:  ${result.created} card${result.created !== 1 ? "s" : ""}`,
  );
  console.log(
    `  Updated:  ${result.updated} card${result.updated !== 1 ? "s" : ""}`,
  );
  console.log(`\nDone. ImportBatch id: ${result.batchId}`);
}

main(fileArg, userEmail)
  .catch((err) => {
    console.error(
      `\nFatal error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
