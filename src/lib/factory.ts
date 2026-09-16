export type Settings = {
  price_per_row: number;
  place_a_capacity: number;
  place_b_capacity: number;
  place_a_sellable: number;
  place_b_sellable: number;
};

export const DEFAULT_SETTINGS: Settings = {
  price_per_row: 0,
  place_a_capacity: 32,
  place_b_capacity: 48,
  place_a_sellable: 28,
  place_b_sellable: 42,
};

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Saturday-based week start, returned as YYYY-MM-DD. */
export function weekStart(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 1) % 7; // Saturday = 0
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function formatIQD(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n || 0));
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB");
}
