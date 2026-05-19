import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { readSessionCookie } from "@/lib/session/cookies";

/**
 * Home — pure redirect based on session state.
 *
 *   Not logged in              → /login      (proxy handles this first, but guard here too)
 *   Logged in, no lastStudy    → /welcome    (first-time user)
 *   Logged in, lastStudy=""    → /study      (previously studied all cards)
 *   Logged in, lastStudy="…"  → /study?tagIds=…  (previously studied a topic filter)
 */
export default async function Home() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const store = await cookies();
  const lastStudy = store.get("lastStudy")?.value;

  if (lastStudy === undefined) {
    // Cookie absent — first visit or cleared. Show the welcome page.
    redirect("/welcome");
  }

  redirect(lastStudy ? `/study?tagIds=${lastStudy}` : "/study");
}
