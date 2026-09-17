export type Settings = {
  price_per_row: number;
  place_a_capacity: number;
  place_b_capacity: number;
  place_a_sellable: number;
  place_b_sellable: number;
  auto_release_hours: number;
  auto_release_enabled: boolean;
  rows_released_at: string | null;
  checklist_auto_reset: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  price_per_row: 0,
  place_a_capacity: 32,
  place_b_capacity: 48,
  place_a_sellable: 28,
  place_b_sellable: 42,
  auto_release_hours: 17,
  auto_release_enabled: true,
  rows_released_at: null,
  checklist_auto_reset: true,
};

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Moment from which sales still occupy rows. Rows sold before this are free again,
 * either because the automatic release window passed or the manager released them.
 */
export function rowsActiveSince(settings?: Settings | null): Date {
  const base = settings?.auto_release_enabled
    ? new Date(Date.now() - (settings.auto_release_hours || 17) * 3600 * 1000)
    : startOfToday();
  const released = settings?.rows_released_at ? new Date(settings.rows_released_at) : null;
  return released && released > base ? released : base;
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
