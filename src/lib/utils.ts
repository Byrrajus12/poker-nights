export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatDuration(startedAt: string, endedAt?: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export function formatSessionDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Tonight";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const daysAgo = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (daysAgo < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
