import { waLink } from "@/lib/share";
import { btn } from "./styles";

export function ShareButton({ message, label = "Share to WhatsApp" }: { message: string; label?: string }) {
  return (
    <a href={waLink(message)} target="_blank" rel="noopener noreferrer" className={btn.primary}>
      <span aria-hidden>💬</span>
      {label}
    </a>
  );
}
