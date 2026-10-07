import { describe, it, expect } from "vitest";
import worker from "./index";

// A Request as the Workers runtime delivers it to fetch handlers.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
type IncomingRequest = InstanceType<typeof IncomingRequest>;

describe("webhook handler", () => {
    const env: Env = { SECRET_TOKEN: "s3cret" };

    const update = {
        update_id: 1,
        inline_query: {
            id: "abc",
            from: {
                id: 42,
                is_bot: false,
                first_name: "Test",
                language_code: "en",
            },
            query: "hello",
            offset: "",
        },
    };

    function post(
        body: unknown,
        secret: string | null = env.SECRET_TOKEN,
        path = "/",
    ): IncomingRequest {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (secret !== null) {
            headers["X-Telegram-Bot-Api-Secret-Token"] = secret;
        }
        return new IncomingRequest(`https://pgb.example${path}`, {
            method: "POST",
            headers,
            body: typeof body === "string" ? body : JSON.stringify(body),
        });
    }

    const run = (request: IncomingRequest) => worker.fetch(request, env);

    it("answers inline queries in the webhook response", async () => {
        const res = await run(post(update));

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/json");
        expect(await res.json()).toEqual({
            method: "answerInlineQuery",
            inline_query_id: "abc",
            results: [
                expect.objectContaining({ id: "divine", title: "Divination" }),
                expect.objectContaining({ id: "pia", title: "Pia" }),
            ],
        });
    });

    it("ignores other updates", async () => {
        const res = await run(post({ update_id: 2, message: {} }));

        expect(res.status).toBe(200);
        expect(await res.text()).toBe("");
    });

    it("rejects non-POST requests", async () => {
        const res = await run(new IncomingRequest("https://pgb.example/"));

        expect(res.status).toBe(405);
    });

    it("rejects malformed bodies", async () => {
        const res = await run(post("{"));

        expect(res.status).toBe(400);
    });

    it("answers on any path", async () => {
        const res = await run(post(update, env.SECRET_TOKEN, "/any/path"));

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ method: "answerInlineQuery" });
    });

    it.each([
        ["a missing", null],
        ["a wrong", "wrong"],
        ["an empty", ""],
    ])("rejects %s secret token", async (_, secret) => {
        const res = await run(post(update, secret));

        expect(res.status).toBe(401);
    });

    it("rejects everything without a secret token", async () => {
        const res = await worker.fetch(post(update, ""), {
            ...env,
            SECRET_TOKEN: "",
        });

        expect(res.status).toBe(401);
    });
});
