import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { appCache } from "@/db/schema";
import { FALLBACK_WEEKENDS, todayIso, validWeekends, type Weekend } from "@/lib/longWeekends";

const CACHE_KEY = "long-weekends:v1";
const REFRESH_MS = 24 * 60 * 60 * 1000;

const WeekendSchema = z.object({
  weekends: z.array(z.object({ label: z.string(), startDate: z.string(), endDate: z.string() })),
});

let client: Anthropic | null = null;
let refreshing = false;

async function generate(): Promise<Weekend[]> {
  client ??= new Anthropic();
  const today = todayIso();
  const response = await client.beta.messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    output_config: { effort: "medium", format: betaZodOutputFormat(WeekendSchema) },
    system:
      "You list upcoming long weekends in India for friends planning a short trip. Use Indian national and widely observed public holidays and the adjacent weekend. Each entry: a short holiday label (max 20 characters), startDate and endDate as YYYY-MM-DD, spanning 2 to 4 nights and including a Saturday or Sunday. Only dates after the given today. Order by date. Double-check weekdays before answering.",
    messages: [{ role: "user", content: `Today is ${today}. List the long weekends in the next 6 months.` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return [];
  return validWeekends(response.parsed_output.weekends);
}

async function refresh(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const weekends = await generate();
    if (weekends.length >= 3) {
      const row = { key: CACHE_KEY, value: weekends, createdAt: new Date().toISOString() };
      await db.insert(appCache).values(row).onConflictDoUpdate({ target: appCache.key, set: row });
    }
  } catch (error) {
    console.error("long-weekend refresh failed:", error instanceof Error ? error.message : "unknown error");
  } finally {
    refreshing = false;
  }
}

// Never blocks the page: serves the cached AI list (or the backup list), refreshing in the background daily.
export async function upcomingLongWeekends(): Promise<Weekend[]> {
  let row: typeof appCache.$inferSelect | undefined;
  try {
    [row] = await db.select().from(appCache).where(eq(appCache.key, CACHE_KEY));
  } catch (error) {
    console.error("long-weekend cache unavailable:", error instanceof Error ? error.message : "unknown error");
    return validWeekends(FALLBACK_WEEKENDS);
  }
  const cached = row ? validWeekends(row.value as Weekend[]) : [];
  const stale = !row || Date.now() - new Date(row.createdAt).getTime() > REFRESH_MS || cached.length < 3;
  if (stale && process.env.ANTHROPIC_API_KEY) after(refresh);
  return cached.length >= 3 ? cached : validWeekends(FALLBACK_WEEKENDS);
}
