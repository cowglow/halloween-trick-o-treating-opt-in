// docs/SPEC.md section 8: "label 1-60 and note 0-500 chars after trim and Unicode NFC
// normalization; reject control characters (keep umlauts and emoji)". Pure/testable
// on its own; ports/http/validation/space.schemas.ts wires this into Zod.

// C0/C1 control characters, excluding tab/newline/CR (\t \n \r) - a note is a
// textarea and a line break is normal input, not an attack; every other control
// character (including the null byte and ESC) has no legitimate use in a label or
// note and is rejected outright rather than silently stripped.
const DISALLOWED_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

export function normalizeSpaceText(raw: string): string {
  return raw.trim().normalize("NFC");
}

export function hasDisallowedControlCharacters(value: string): boolean {
  return DISALLOWED_CONTROL_CHARS.test(value);
}

// Coordinates are rounded, never rejected for having "too much" precision - a
// browser geolocation reading routinely has far more than 5 decimals, and the
// requirement (section 8) is about not *storing* more precision than a front-door
// pin needs (~1m), not about validating client input strictly.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100000) / 100000;
}
