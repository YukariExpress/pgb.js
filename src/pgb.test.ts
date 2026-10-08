import { describe, it, expect } from "vitest";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import type { RandomGenerator } from "pure-rand/types/RandomGenerator";
import {
    DIVINATIONS,
    DIVINATION_TOTAL,
    WINDOW,
    buildInlineQueryResults,
    buildUpdateContext,
    divine,
    getDivination,
    getDivineTitle,
    getPiaPrefix,
    getUserID,
    getUserLocale,
    pia,
} from "./pgb";

/** Draws n raw values from the generator. */
function draw(rng: RandomGenerator, n = 4): number[] {
    return Array.from({ length: n }, () => rng.next());
}

/** Returns C(n, k). */
function binomial(n: number, k: number): number {
    let c = 1;
    for (let i = 0; i < k; i++) {
        c = (c * (n - i)) / (i + 1);
    }
    return c;
}

describe("getPiaPrefix", () => {
    it.each([
        [0, "Pia!▼(ｏ ‵-′)ノ★ "],
        [1, "Pia!<(=ｏ ‵-′)ノ☆ "],
        [7, "Pia!<(=ｏ ‵-′)ノ☆ "],
    ])("maps %s", (r, expected) => {
        expect(getPiaPrefix(r)).toBe(expected);
    });
});

describe("pia", () => {
    it("starts with the prefix and ends with the query", () => {
        const ctx = { rng: xoroshiro128plus(1), query: "hello", locale: "" };
        const result = pia(ctx);
        expect(result.startsWith("Pia!")).toBe(true);
        expect(result.endsWith("hello")).toBe(true);
    });
});

describe("DIVINATIONS", () => {
    const intensities = [
        "极小",
        "超小",
        "特小",
        "甚小",
        "小",
        "",
        "大",
        "甚大",
        "特大",
        "超大",
        "极大",
    ];

    const expected = new Map<string, number>([
        ["尚可", 2048],
        ...intensities.flatMap((name, k): [string, number][] => [
            [name + "吉", 7 * binomial(10, k)],
            [name + "凶", 7 * binomial(10, k)],
        ]),
    ]);

    it("has the exact weight of each result", () => {
        expect(new Map(DIVINATIONS.map(([w, r]) => [r, w]))).toEqual(expected);
    });

    it("sums to the total", () => {
        const sum = DIVINATIONS.reduce((acc, [w]) => acc + w, 0);
        expect(sum).toBe(DIVINATION_TOTAL);
    });
});

describe("getDivination", () => {
    it("covers each result with exactly its weight of rolls", () => {
        const counts = new Map<string, number>();
        for (let r = 0; r < DIVINATION_TOTAL; r++) {
            const result = getDivination(r);
            counts.set(result, (counts.get(result) ?? 0) + 1);
        }
        expect(counts).toEqual(new Map(DIVINATIONS.map(([w, r]) => [r, w])));
    });

    it.each([
        [0, "极小凶"],
        [6, "极小凶"],
        [7, "超小凶"],
        [7167, "极大凶"],
        [7168, "尚可"],
        [9215, "尚可"],
        [9216, "极小吉"],
        [16383, "极大吉"],
    ])("maps %s", (r, expected) => {
        expect(getDivination(r)).toBe(expected);
    });

    it("rejects rolls out of range", () => {
        expect(() => getDivination(DIVINATION_TOTAL)).toThrow(RangeError);
    });
});

describe("divine", () => {
    const results = new Set(DIVINATIONS.map(([, r]) => r));

    it.each([1, 2, 3, 42])("formats the result for seed %s", (seed) => {
        const ctx = { rng: xoroshiro128plus(seed), query: "q", locale: "" };
        const [query, result] = divine(ctx).split("\n");
        expect(query).toBe("所求事项: q");
        expect(result.startsWith("结果: ")).toBe(true);
        expect(results.has(result.slice("结果: ".length))).toBe(true);
    });
});

describe("getDivineTitle", () => {
    it.each([
        ["zh", "求签"],
        ["zh-hans", "求签"],
        ["zh-hant", "求籤"],
        ["zh-Hant-TW", "求籤"],
        ["ZH-HANT", "求籤"],
        ["ja", "おみくじ"],
        ["de-AT", "Wahrsagung"],
        ["fr", "Divination"],
        ["ru", "Гадание"],
        ["es-MX", "Adivinación"],
        ["it", "Divinazione"],
        ["la", "Divinatio"],
        ["pt-BR", "Adivinhação"],
        ["pt-PT", "Adivinhação"],
        ["be", "Варажба"],
        ["ca", "Endevinació"],
        ["hr", "Proricanje"],
        ["cs", "Věštění"],
        ["nl", "Waarzeggerij"],
        ["fi", "Ennustus"],
        ["ko", "점술"],
        ["nb", "Spådom"],
        ["no", "Spådom"],
        ["pl", "Wróżba"],
        ["ro", "Divinație"],
        ["sr", "Прорицање"],
        ["sr-Cyrl", "Прорицање"],
        ["sr-Latn", "Proricanje"],
        ["uk", "Ворожіння"],
        ["en", "Divination"],
        ["en-US", "Divination"],
        ["", "Divination"],
        ["xx", "Divination"],
        ["constructor", "Divination"],
    ])("maps %s", (locale, expected) => {
        expect(getDivineTitle(locale)).toBe(expected);
    });
});

describe("getUserID", () => {
    it("extracts the ID", () => {
        expect(getUserID({ id: 12345, is_bot: false, first_name: "T" })).toBe(
            12345n,
        );
        expect(getUserID(undefined)).toBe(0n);
    });
});

describe("getUserLocale", () => {
    const user = { id: 1, is_bot: false, first_name: "T" };

    it("extracts the locale with a zh fallback", () => {
        expect(getUserLocale({ ...user, language_code: "en" })).toBe("en");
        expect(getUserLocale({ ...user, language_code: "" })).toBe("zh");
        expect(getUserLocale(user)).toBe("zh");
        expect(getUserLocale(undefined)).toBe("zh");
    });
});

describe("buildUpdateContext", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);

    it("is deterministic for the same input", async () => {
        const c1 = await buildUpdateContext(12345n, "test-query", "zh", now);
        const c2 = await buildUpdateContext(12345n, "test-query", "zh", now);
        expect(c1.query).toBe("test-query");
        expect(c1.locale).toBe("zh");
        expect(draw(c1.rng)).toEqual(draw(c2.rng));
    });

    it("is stable within a time window", async () => {
        const end = now + WINDOW * 1000 - 1;
        const c1 = await buildUpdateContext(1n, "q", "zh", now);
        const c2 = await buildUpdateContext(1n, "q", "zh", end);
        expect(draw(c1.rng)).toEqual(draw(c2.rng));
    });

    it.each([
        ["time window", 1n, "q", now + WINDOW * 1000],
        ["user", 2n, "q", now],
        ["query", 1n, "p", now],
    ])("changes across %s", async (_, userID, query, time) => {
        const base = await buildUpdateContext(1n, "q", "zh", now);
        const ctx = await buildUpdateContext(userID, query, "zh", time);
        expect(draw(ctx.rng)).not.toEqual(draw(base.rng));
    });
});

describe("buildInlineQueryResults", () => {
    it("returns divine and pia articles", async () => {
        const user = {
            id: 42,
            is_bot: false,
            first_name: "Test",
            language_code: "zh",
        };
        const results = await buildInlineQueryResults(user, "问题");

        expect(results.map(({ type, id, title }) => [type, id, title])).toEqual(
            [
                ["article", "divine", "求签"],
                ["article", "pia", "Pia"],
            ],
        );

        const [divineText, piaText] = results.map(
            (r) =>
                (r.input_message_content as { message_text: string })
                    .message_text,
        );
        expect(divineText.startsWith("所求事项: 问题\n结果: ")).toBe(true);
        expect(piaText.endsWith("问题")).toBe(true);
    });
});
