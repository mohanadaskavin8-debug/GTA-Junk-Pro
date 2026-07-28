import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface AvailabilityWindow {
  start: string; // 24h "HH:MM"
  end: string; // 24h "HH:MM"
}

export interface AvailabilityConfig {
  /** Available days of week, 0=Sunday .. 6=Saturday. */
  days: number[];
  windows: AvailabilityWindow[];
}

export const AVAILABILITY_KEY = "availability";

/** Matches the original hardcoded behavior: every day, five 2-hour windows. */
export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  days: [0, 1, 2, 3, 4, 5, 6],
  windows: [
    { start: "08:00", end: "10:00" },
    { start: "10:00", end: "12:00" },
    { start: "12:00", end: "14:00" },
    { start: "14:00", end: "16:00" },
    { start: "16:00", end: "18:00" },
  ],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function to12h(hhmm: string): string {
  const [hStr = "0", m = "00"] = hhmm.split(":");
  let h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${suffix}`;
}

/**
 * Customer-facing label, e.g. "08:00 AM - 10:00 AM". This exact format is
 * stored on bookings (and matches rows created before availability existed).
 */
export function windowLabel(w: AvailabilityWindow): string {
  return `${to12h(w.start)} - ${to12h(w.end)}`;
}

/** Returns an error message, or null when the config is structurally valid. */
export function validateAvailabilityConfig(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return "Availability must be an object";
  const { days, windows } = input as { days?: unknown; windows?: unknown };

  if (!Array.isArray(days) || days.length === 0) return "Pick at least one available day";
  if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return "Days must be integers between 0 (Sunday) and 6 (Saturday)";
  }
  if (new Set(days).size !== days.length) return "Days must not repeat";

  if (!Array.isArray(windows) || windows.length === 0) return "Add at least one arrival window";
  if (windows.length > 12) return "At most 12 arrival windows are allowed";
  const seen = new Set<string>();
  for (const w of windows as Array<{ start?: unknown; end?: unknown }>) {
    if (typeof w?.start !== "string" || typeof w?.end !== "string") {
      return "Each window needs a start and end time";
    }
    if (!HHMM.test(w.start) || !HHMM.test(w.end)) {
      return "Times must be in 24-hour HH:MM format";
    }
    if (w.start >= w.end) {
      return `Window ${w.start}–${w.end}: end time must be after start time`;
    }
    const key = `${w.start}-${w.end}`;
    if (seen.has(key)) return "Duplicate arrival window";
    seen.add(key);
  }
  return null;
}

export function normalizeAvailability(config: AvailabilityConfig): AvailabilityConfig {
  return {
    days: [...config.days].sort((a, b) => a - b),
    windows: [...config.windows].sort((a, b) => a.start.localeCompare(b.start)),
  };
}

export async function loadAvailability(): Promise<AvailabilityConfig> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, AVAILABILITY_KEY));
  if (!row) return DEFAULT_AVAILABILITY;
  try {
    const parsed = JSON.parse(row.value) as AvailabilityConfig;
    const error = validateAvailabilityConfig(parsed);
    if (error) throw new Error(error);
    return normalizeAvailability(parsed);
  } catch (err) {
    // A corrupt settings row must never take down public booking — fall back
    // to defaults, but complain loudly in the logs.
    logger.error({ err }, "Stored availability is invalid; using defaults");
    return DEFAULT_AVAILABILITY;
  }
}

/** Shape returned by the API: windows carry their customer-facing label. */
export function toApiShape(config: AvailabilityConfig) {
  return {
    days: config.days,
    windows: config.windows.map((w) => ({ ...w, label: windowLabel(w) })),
  };
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Today's date (YYYY-MM-DD) in the business's timezone. */
export function torontoToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
}

/**
 * Validate a requested service date + arrival window against the configured
 * availability. Returns an error message, or null when acceptable.
 */
export async function validateSchedule(
  serviceDate: string,
  serviceTime: string,
): Promise<string | null> {
  // Round-trip check: JS rolls over impossible dates (e.g. "2027-02-29"
  // parses as Mar 1), so re-serialize and compare against the input.
  const parsed = new Date(`${serviceDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== serviceDate
  ) {
    return "serviceDate must be a valid YYYY-MM-DD date";
  }
  if (serviceDate < torontoToday()) {
    return "serviceDate cannot be in the past";
  }
  const config = await loadAvailability();
  const weekday = parsed.getUTCDay();
  if (!config.days.includes(weekday)) {
    return `We don't book estimates on ${DAY_NAMES[weekday]}s — please pick another day`;
  }
  if (!config.windows.some((w) => windowLabel(w) === serviceTime)) {
    return "serviceTime must be one of the offered arrival windows";
  }
  return null;
}
