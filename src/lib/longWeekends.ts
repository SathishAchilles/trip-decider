export type Weekend = { label: string; startDate: string; endDate: string };

// Backup list (weekdays checked) used until an AI-generated list is cached.
export const FALLBACK_WEEKENDS: Weekend[] = [
  { label: "Gandhi Jayanti", startDate: "2026-10-02", endDate: "2026-10-04" },
  { label: "Diwali", startDate: "2026-11-07", endDate: "2026-11-09" },
  { label: "Christmas", startDate: "2026-12-25", endDate: "2026-12-27" },
  { label: "New Year", startDate: "2027-01-01", endDate: "2027-01-03" },
  { label: "Republic Day", startDate: "2027-01-23", endDate: "2027-01-26" },
  { label: "Good Friday", startDate: "2027-03-26", endDate: "2027-03-28" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function utc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// Keeps only well-formed, future, 1-4 night windows that include a Saturday or Sunday.
export function validWeekends(list: Weekend[], now = new Date(), horizonDays = 240): Weekend[] {
  const today = utc(todayIso(now));
  const horizon = today + horizonDays * 86_400_000;
  const seen = new Set<string>();
  return list
    .filter((w) => {
      if (!ISO.test(w.startDate) || !ISO.test(w.endDate)) return false;
      const start = utc(w.startDate);
      const end = utc(w.endDate);
      const nights = (end - start) / 86_400_000;
      if (!(start > today && start <= horizon && nights >= 1 && nights <= 4)) return false;
      const label = w.label.trim();
      if (label.length < 2 || label.length > 28 || seen.has(w.startDate)) return false;
      let weekend = false;
      for (let t = start; t <= end; t += 86_400_000) {
        const day = new Date(t).getUTCDay();
        if (day === 0 || day === 6) weekend = true;
      }
      if (!weekend) return false;
      seen.add(w.startDate);
      return true;
    })
    .map((w) => ({ ...w, label: w.label.trim() }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8);
}
