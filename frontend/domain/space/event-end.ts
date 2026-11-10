import { COMMUNITY } from "domain/community/community-config.ts";

// When the event is over: the API answers 410 from then on and, a minute
// later, the server is torn down (deploy/teardown.sh). The frontend
// learns the moment at build time (VITE_EVENT_END_AT, the EVENT_END_AT
// repository variable) so it can show the review page with no server at all.
export const DEFAULT_EVENT_END_AT = COMMUNITY.eventEndAt;

/** The configured end, or the default when it's unset, empty or not a date. */
export function eventEndAt(configured: string | undefined): Date {
  const date = new Date(configured || DEFAULT_EVENT_END_AT);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_EVENT_END_AT) : date;
}

export function hasEventEnded(end: Date, now: Date = new Date()): boolean {
  return now.getTime() >= end.getTime();
}
