import { bench, describe } from "vitest";
import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plusFromState } from "pure-rand/generator/xoroshiro128plus";
import worker from "./index";
import {
    buildInlineQueryResults,
    buildUpdateContext,
    divine,
    pia,
} from "./pgb";

// Benchmarks of each stage of the request path, from hashing the input to
// answering a full webhook request, to inform future design decisions.

// A Request as the Workers runtime delivers it to fetch handlers.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const env: Env = { SECRET_TOKEN: "s3cret" };
const user = { id: 42, is_bot: false, first_name: "T", language_code: "zh" };
const body = JSON.stringify({
    update_id: 1,
    inline_query: { id: "abc", from: user, query: "问题", offset: "" },
});
const input = new Uint8Array(16 + new TextEncoder().encode("问题").length);
const state = [1, 2, 3, 4];

describe("request path", () => {
    bench("SHA-256 digest of the input", async () => {
        await crypto.subtle.digest("SHA-256", input);
    });

    bench("xoroshiro128+ from state and two draws", () => {
        const rng = xoroshiro128plusFromState(state);
        uniformInt(rng, 0, 16383);
        uniformInt(rng, 0, 7);
    });

    bench("buildUpdateContext", async () => {
        await buildUpdateContext(42n, "问题", "zh");
    });

    bench("buildUpdateContext, divine and pia", async () => {
        const ctx = await buildUpdateContext(42n, "问题", "zh");
        divine(ctx);
        pia(ctx);
    });

    bench("buildInlineQueryResults", async () => {
        await buildInlineQueryResults(user, "问题");
    });

    bench("full webhook request", async () => {
        const res = await worker.fetch(
            new IncomingRequest("https://pgb.example/", {
                method: "POST",
                headers: { "X-Telegram-Bot-Api-Secret-Token": "s3cret" },
                body,
            }),
            env,
        );
        await res.text();
    });
});
