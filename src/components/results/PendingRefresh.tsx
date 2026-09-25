"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 5000;
const MAX_TRIES = 36;

// Re-renders the page while the AI ranking runs in the background (about three minutes at most).
export function PendingRefresh() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > MAX_TRIES) return clearInterval(timer);
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
