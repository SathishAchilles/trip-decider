import Link from "next/link";
import type { ReactNode } from "react";
import { StageRail } from "./StageRail";

export function Logo() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="size-7">
      <circle cx="16" cy="16" r="15" fill="var(--brand)" />
      <path d="M8 19c4-7 12-9 16-6-3 0-6 2-8 6l-2-3-6 3z" fill="#fff" />
    </svg>
  );
}

export function Shell({
  children,
  stage,
  right,
}: {
  children: ReactNode;
  stage?: { steps: readonly string[]; current: number };
  right?: ReactNode;
}) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
          <Logo />
          Trip Decider
        </Link>
        {right && <div className="text-sm font-medium text-muted-foreground">{right}</div>}
      </header>
      <div
        className={`mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-8 ${stage ? "lg:grid lg:grid-cols-[56px_1fr] lg:gap-10" : ""}`}
      >
        {stage && <StageRail steps={stage.steps} current={stage.current} />}
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
