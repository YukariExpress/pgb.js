// PGB: Pythia Gata Bot
// Copyright (C) 2019-2026  Yishen Miao
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plusFromState } from "pure-rand/generator/xoroshiro128plus";
import type { RandomGenerator } from "pure-rand/types/RandomGenerator";
import type {
    InlineQueryResultArticle,
    User,
} from "typescript-telegram-bot-api";

/**
 * Length of the window, in seconds, during which the same user asking the same
 * question receives the same answer.
 */
export const WINDOW = 30 * 60;

/** The context of a single inline query. */
export interface UpdateContext {
    rng: RandomGenerator;
    query: string;
    locale: string;
}

/**
 * Returns the pia prefix for a roll in [0, 7]. There is a 1 in 8 chance to
 * summon a dog and a 7 in 8 chance to summon a cat.
 */
export function getPiaPrefix(r: number): string {
    switch (r) {
        case 0:
            return "Pia!▼(ｏ ‵-′)ノ★ ";
        default:
            return "Pia!<(=ｏ ‵-′)ノ☆ ";
    }
}

/**
 * Randomly selects a pia (slap) performed by either a dog or a cat and appends
 * the query.
 */
export function pia(ctx: UpdateContext): string {
    return getPiaPrefix(uniformInt(ctx.rng, 0, 7)) + ctx.query;
}

/**
 * Weights of each divination result out of 16384. 尚可 has a weight of 2048
 * (1/8). 吉 and 凶 each total 7168 (7/16), split by intensity in proportion to
 * the binomial coefficients C(10, k), giving 7 * C(10, k) for 极小 (k = 0)
 * through 极大 (k = 10).
 */
export const DIVINATIONS: readonly [number, string][] = [
    [7, "极小凶"],
    [70, "超小凶"],
    [315, "特小凶"],
    [840, "甚小凶"],
    [1470, "小凶"],
    [1764, "凶"],
    [1470, "大凶"],
    [840, "甚大凶"],
    [315, "特大凶"],
    [70, "超大凶"],
    [7, "极大凶"],
    [2048, "尚可"],
    [7, "极小吉"],
    [70, "超小吉"],
    [315, "特小吉"],
    [840, "甚小吉"],
    [1470, "小吉"],
    [1764, "吉"],
    [1470, "大吉"],
    [840, "甚大吉"],
    [315, "特大吉"],
    [70, "超大吉"],
    [7, "极大吉"],
];

/** Sum of the weights of all divination results. */
export const DIVINATION_TOTAL = 16384;

/**
 * Returns the divination result for a roll in [0, DIVINATION_TOTAL - 1], each
 * result covering a number of consecutive rolls equal to its weight.
 */
export function getDivination(r: number): string {
    let rest = r;
    for (const [weight, result] of DIVINATIONS) {
        if (rest < weight) {
            return result;
        }
        rest -= weight;
    }
    throw new RangeError(`roll ${r} out of range`);
}

/** Generates a divination result for the query in the context. */
export function divine(ctx: UpdateContext): string {
    const result = getDivination(uniformInt(ctx.rng, 0, DIVINATION_TOTAL - 1));

    return `所求事项: ${ctx.query}\n结果: ${result}`;
}

/** Returns the localized titles for the divine and pia results. */
export function getLocaleTitles(locale: string): [string, string] {
    switch (locale) {
        case "zh":
            return ["求签", "Pia"];
        default:
            return ["Divination", "Pia"];
    }
}

/** Extracts the user ID. Returns 0 if the user is missing. */
export function getUserID(user?: User): bigint {
    return user ? BigInt(user.id) : 0n;
}

/**
 * Extracts the language code of the user. Returns "zh" if the user or the
 * language code is missing.
 */
export function getUserLocale(user?: User): string {
    return user?.language_code || "zh";
}

/**
 * Creates a context with a deterministic xoroshiro128+ generator whose state is
 * taken from the SHA-256 hash of the user ID, the start of the current time
 * window, and the query.
 *
 * @param now - Current time in milliseconds since the epoch.
 */
export async function buildUpdateContext(
    userID: bigint,
    query: string,
    locale: string,
    now: number = Date.now(),
): Promise<UpdateContext> {
    const text = new TextEncoder().encode(query);
    const buf = new Uint8Array(16 + text.length);
    const view = new DataView(buf.buffer);

    const window = Math.floor(now / 1000 / WINDOW) * WINDOW;

    view.setBigUint64(0, BigInt.asUintN(64, userID), true);
    view.setBigInt64(8, BigInt(window), true);
    buf.set(text, 16);

    const digest = new DataView(await crypto.subtle.digest("SHA-256", buf));
    const state = [0, 4, 8, 12].map((i) => digest.getInt32(i));

    return { rng: xoroshiro128plusFromState(state), query, locale };
}

/**
 * Generates the divine and pia articles for a user and query.
 *
 * @param now - Current time in milliseconds since the epoch.
 */
export async function buildInlineQueryResults(
    user: User | undefined,
    query: string,
    now?: number,
): Promise<InlineQueryResultArticle[]> {
    const locale = getUserLocale(user);
    const ctx = await buildUpdateContext(getUserID(user), query, locale, now);
    const [divineTitle, piaTitle] = getLocaleTitles(locale);

    return [
        {
            type: "article",
            id: "divine",
            title: divineTitle,
            input_message_content: { message_text: divine(ctx) },
        },
        {
            type: "article",
            id: "pia",
            title: piaTitle,
            input_message_content: { message_text: pia(ctx) },
        },
    ];
}
