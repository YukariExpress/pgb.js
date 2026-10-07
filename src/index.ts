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

/**
 * Pgb is a Telegram inline bot that generates random results based on the
 * user's query text and the current time.
 *
 * It receives updates through a webhook, which must be registered with the URL
 * path set to SECRET_PATH. Inline queries are answered in the webhook response,
 * so the bot never calls the Bot API itself.
 */

import type {
    InlineQuery,
    TelegramBot,
    Update,
} from "typescript-telegram-bot-api";

import { buildInlineQueryResults } from "./pgb";

/** A Bot API call returned as the body of a webhook response. */
export type AnswerInlineQuery = {
    method: "answerInlineQuery";
} & Parameters<TelegramBot["answerInlineQuery"]>[0];

/** Builds the answer to an inline query with the divine and pia results. */
export async function handler(query: InlineQuery): Promise<AnswerInlineQuery> {
    return {
        method: "answerInlineQuery",
        inline_query_id: query.id,
        results: await buildInlineQueryResults(query.from, query.query),
    };
}

/**
 * Reports whether a URL path is the secret webhook path, with or without a
 * trailing slash. Slashes around the secret path are ignored, and an empty
 * secret path never matches.
 */
export function isWebhookPath(pathname: string, secretPath: string): boolean {
    const path = secretPath.replace(/^\/+|\/+$/g, "");
    return path !== "" && (pathname === `/${path}` || pathname === `/${path}/`);
}

export default {
    async fetch(request, env): Promise<Response> {
        if (
            !isWebhookPath(new URL(request.url).pathname, env.SECRET_PATH ?? "")
        ) {
            return new Response("Not Found", { status: 404 });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: { Allow: "POST" },
            });
        }

        let update: Update;
        try {
            update = await request.json();
        } catch {
            return new Response("Bad Request", { status: 400 });
        }

        if (!update.inline_query) {
            return new Response(null, { status: 200 });
        }

        return Response.json(await handler(update.inline_query));
    },
} satisfies ExportedHandler<Env>;
