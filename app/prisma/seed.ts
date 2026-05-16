// Seed script: creates the default user and the Canadian PPL deck.
// Run via: npx prisma db seed
//
// Credentials come from environment variables so nothing sensitive lives in
// source code. In local development these are set in docker-compose.yml.
// The script is idempotent — safe to re-run against an existing database.

import "dotenv/config";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const scryptAsync = promisify(scrypt);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hashes a password using Node's built-in scrypt. The format is
// "<hash>.<salt>" so the verifier can reconstruct both parts.
// Phase 3 auth will use this same function to verify passwords at login.
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD must be set before running the seed."
    );
  }

  const passwordHash = await hashPassword(password);

  // Upsert the seed user so re-runs are safe. The password hash is always
  // refreshed on re-seed, which is fine for a development seed user.
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName: "Admin" },
    create: {
      email,
      displayName: "Admin",
      passwordHash,
    },
  });

  console.log(`Seeded user: ${user.email} (id: ${user.id})`);

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
