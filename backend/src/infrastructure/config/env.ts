// Reads optional settings from the environment. An empty value counts as
// unset (docker compose passes an unset `${VAR}` through as ""), and a value
// that doesn't parse stops the server at startup instead of running with
// NaN or an Invalid Date: `Date.now() >= NaN` is always false, so a bad
// EVENT_END_AT would silently keep the map open forever.
type Env = Record<string, string | undefined>;

export function readNumber(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return value;
}

export function readDate(env: Env, name: string, fallback: string): Date {
  const raw = env[name];
  const value = new Date(
    raw === undefined || raw.trim() === "" ? fallback : raw,
  );
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be an ISO 8601 date-time, got "${raw}"`);
  }
  return value;
}
