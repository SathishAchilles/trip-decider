import type { Stance } from "@/lib/types";

export const STANCE_TONE: Record<Stance, string> = {
  loves: "text-fit",
  good: "text-fit",
  ok: "text-stretch",
  unhappy: "text-veto",
  veto: "text-veto",
  pending: "text-muted-foreground",
  flexible: "text-muted-foreground",
};
