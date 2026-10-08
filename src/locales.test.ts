import { describe, it, expect } from "vitest";
import { DEFAULT_LOCALE, DIVINE_TITLES } from "./locales";

describe("DIVINE_TITLES", () => {
    it("contains the default locale", () => {
        expect(DIVINE_TITLES.has(DEFAULT_LOCALE)).toBe(true);
    });

    it("has lowercase tags", () => {
        for (const tag of DIVINE_TITLES.keys()) {
            expect(tag).toBe(tag.toLowerCase());
        }
    });

    it("has non-empty titles", () => {
        for (const title of DIVINE_TITLES.values()) {
            expect(title).not.toBe("");
        }
    });
});
