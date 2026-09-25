import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { HARD_NO_TAGS, HARD_NO_TAG_IDS, type HardNoTag } from "@/lib/catalogue";

const TagsSchema = z.object({
  tags: z.array(z.enum(HARD_NO_TAG_IDS)),
});

const TAG_GUIDE = HARD_NO_TAG_IDS.map((id) => `- ${id}: ${HARD_NO_TAGS[id]}`).join("\n");

const SYSTEM_PROMPT = `You map a traveller's free-text trip dealbreakers onto a fixed list of tags.
Return only tags the text clearly implies, at most three, most important first. Return an empty list if none apply.

Tags:
${TAG_GUIDE}`;

let client: Anthropic | null = null;

// Suggests hard-no tags for free text. The person still confirms them; this never writes data.
export async function mapHardNoText(text: string): Promise<HardNoTag[]> {
  const trimmed = text.trim().slice(0, 200);
  if (!trimmed || !process.env.ANTHROPIC_API_KEY) return [];

  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(TagsSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return [];
    return [...new Set(response.parsed_output.tags)].slice(0, 3);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("hard-no mapping failed, status:", error.status);
      return [];
    }
    throw error;
  }
}
