export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
