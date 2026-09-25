"use client";

import { useState } from "react";
import { btn, field } from "./styles";

export function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={url} className={`${field} min-w-0 text-sm`} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy} className={btn.outline}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
