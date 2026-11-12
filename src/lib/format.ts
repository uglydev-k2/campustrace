import { CAMPUS_TIME_ZONE } from "@/lib/constants";

// en-GB gives day-month-year order, the convention used in Ghana.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: CAMPUS_TIME_ZONE,
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: CAMPUS_TIME_ZONE,
});

/** 12 Nov 2026 */
export const formatDate = (date: Date) => dateFormat.format(date);

/** Thu 12 Nov, 2:30 pm */
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

/** YYYY-MM-DD for today on campus, used as the `max` of date inputs. */
export function todayOnCampus(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: CAMPUS_TIME_ZONE,
  }).format(now);
}

/** "3 days ago", "in 2 hours". Falls back to a date after a month. */
export function formatRelative(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), "day");
  return formatDate(date);
}
