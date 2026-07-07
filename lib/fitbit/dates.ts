// Date normalization for Fitbit Takeout files. Worker-safe: no server imports.
//
// The export mixes formats:
//  - intraday/GED files: "MM/DD/YY HH:MM:SS" in the account's local time (SGT)
//  - sleep files: ISO "2026-01-01T23:58:30.000" (local, no offset) and
//    plain "YYYY-MM-DD" (dateOfSleep)
//  - some CSVs: ISO with Z/offset ("2026-01-01T08:17:30Z")
// A "day" must mean Albert's day (Asia/Singapore) exactly once — at parse time.

const SG_TIMEZONE = "Asia/Singapore";

const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}/;
const HAS_OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcInstantToSgDate(d: Date): string | null {
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: SG_TIMEZONE });
}

/**
 * Normalize any Fitbit export date/datetime string to an ISO date (YYYY-MM-DD)
 * meaning the day in Asia/Singapore. Returns null for unparseable input.
 */
export function toIsoDateSG(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // MM/DD/YY[YY] [HH:MM:SS] — already local time; take the date part.
  const mdy = s.match(MDY_RE);
  if (mdy) {
    const month = parseInt(mdy[1], 10);
    const day = parseInt(mdy[2], 10);
    let year = parseInt(mdy[3], 10);
    if (mdy[3].length <= 2) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // Plain ISO date — already a local day.
  if (ISO_DATE_RE.test(s)) return s;

  // ISO datetime with explicit offset/Z — convert instant to SGT day.
  if (ISO_DATETIME_LOCAL_RE.test(s)) {
    if (HAS_OFFSET_RE.test(s)) return utcInstantToSgDate(new Date(s));
    // No offset: Fitbit writes these in the account's local time.
    return s.slice(0, 10);
  }

  return null;
}

/**
 * Normalize a Fitbit local datetime ("MM/DD/YY HH:MM:SS" or ISO-local) to a
 * full ISO 8601 timestamp with the +08:00 Singapore offset.
 * Returns null for unparseable input.
 */
export function toIsoDatetimeSG(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const mdyTime = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (mdyTime) {
    const month = parseInt(mdyTime[1], 10);
    const day = parseInt(mdyTime[2], 10);
    let year = parseInt(mdyTime[3], 10);
    if (mdyTime[3].length <= 2) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const hh = pad2(parseInt(mdyTime[4], 10));
    const mm = mdyTime[5];
    const ss = mdyTime[6] ?? "00";
    return `${year}-${pad2(month)}-${pad2(day)}T${hh}:${mm}:${ss}+08:00`;
  }

  if (ISO_DATETIME_LOCAL_RE.test(s)) {
    if (HAS_OFFSET_RE.test(s)) {
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      // Re-express the instant in SGT wall-clock time.
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: SG_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
      return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+08:00`;
    }
    // Local time without offset — trust it and stamp the SG offset.
    return `${s.slice(0, 19)}+08:00`;
  }

  const dateOnly = toIsoDateSG(s);
  return dateOnly ? `${dateOnly}T00:00:00+08:00` : null;
}
