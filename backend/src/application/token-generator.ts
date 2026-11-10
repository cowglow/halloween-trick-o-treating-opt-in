// Generating the random token itself is an infrastructure concern (it depends on a
// source of randomness/entropy, unlike hashing it — see domain/auth/magic-link.ts).
export interface TokenGenerator {
  generate(): string;
}
