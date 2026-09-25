import { initialOf } from "@/lib/format";

const TONES = ["bg-[#f3d9c9]", "bg-[#cfe6e3]", "bg-[#e6d6e2]", "bg-[#efe1bf]", "bg-[#d9dfe8]", "bg-[#dfe8cf]"];

export function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[#1f2a2e] ${TONES[index % TONES.length]}`}
    >
      {initialOf(name)}
    </span>
  );
}
