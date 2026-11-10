// import.meta.env.BASE_URL may or may not end in a slash (without one, plain
// concatenation produces "/basetiles/..." - a 404 answered with the SPA's
// HTML), so normalize it. MapLibre additionally requires sprite/glyph URLs to be absolute.
export function spaceAssetPath(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function spaceAssetUrl(path: string, origin: string = globalThis.location?.origin ?? "http://localhost"): string {
  return `${origin}${spaceAssetPath(path)}`;
}
