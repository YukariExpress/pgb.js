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

/** Title of the pia result, which is the same in every language. */
export const PIA_TITLE = "Pia";

/** Language tag used when no other tag matches. */
export const DEFAULT_LOCALE = "en";

/**
 * Localized titles of the divine result, keyed by lowercase IETF language tag.
 * A tag may be a full tag such as "zh-hant" or a primary language subtag such
 * as "zh". Must contain DEFAULT_LOCALE.
 */
export const DIVINE_TITLES: ReadonlyMap<string, string> = new Map([
    ["be", "Варажба"],
    ["ca", "Endevinació"],
    ["cs", "Věštění"],
    ["de", "Wahrsagung"],
    ["en", "Divination"],
    ["es", "Adivinación"],
    ["fi", "Ennustus"],
    ["fr", "Divination"],
    ["hr", "Proricanje"],
    ["it", "Divinazione"],
    ["ja", "おみくじ"],
    ["ko", "점술"],
    ["la", "Divinatio"],
    ["nb", "Spådom"],
    ["nl", "Waarzeggerij"],
    ["no", "Spådom"],
    ["pl", "Wróżba"],
    ["pt", "Adivinhação"],
    ["ro", "Divinație"],
    ["ru", "Гадание"],
    ["sr", "Прорицање"],
    ["sr-latn", "Proricanje"],
    ["uk", "Ворожіння"],
    ["zh", "求签"],
    ["zh-hant", "求籤"],
]);
