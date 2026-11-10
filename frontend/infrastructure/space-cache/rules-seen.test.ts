import { describe, expect, it } from "vitest";
import { hasSeenRules, markRulesSeen } from "infrastructure/space-cache/rules-seen.ts";

function fakeStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const throwing = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("rules seen", () => {
  it("is unseen until marked, per space", () => {
    const storage = fakeStorage();
    expect(hasSeenRules("meckenhausen", storage)).toBe(false);
    markRulesSeen("meckenhausen", storage);
    expect(hasSeenRules("meckenhausen", storage)).toBe(true);
    expect(hasSeenRules("elsewhere", storage)).toBe(false);
  });

  it("shows the rules again when storage is blocked", () => {
    expect(() => markRulesSeen("meckenhausen", throwing)).not.toThrow();
    expect(hasSeenRules("meckenhausen", throwing)).toBe(false);
  });
});
