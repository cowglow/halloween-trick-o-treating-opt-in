// Fills the placeholders a text may contain ("{community}", "{hosting}")
// with values from community/community.json: in every string, and in what
// every text function returns. Keeps the shape and type.
export function fillCommunity<T>(value: T, values: Record<string, string>): T {
  if (typeof value === "string") {
    return Object.entries(values).reduce((text, [key, replacement]) => text.split(`{${key}}`).join(replacement), value as string) as T;
  }
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => fillCommunity(fn(...args), values)) as T;
  }
  if (Array.isArray(value)) return value.map((item) => fillCommunity(item, values)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillCommunity(item, values)])) as T;
  }
  return value;
}
