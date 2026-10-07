import { describe, it, expect } from "vitest";
import worker, { isWebhookPath } from "./index";

// A Request as the Workers runtime delivers it to fetch handlers.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
type IncomingRequest = InstanceType<typeof IncomingRequest>;

describe("webhook handler", () => {
    const env: Env = { SECRET_PATH: "hook" };

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

    function post(body: unknown, path = "/hook"): IncomingRequest {
        return new IncomingRequest(`https://pgb.example${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        const res = await run(new IncomingRequest("https://pgb.example/hook"));

        expect(res.status).toBe(405);
    });

    it("rejects malformed bodies", async () => {
        const res = await run(post("{"));

        expect(res.status).toBe(400);
    });

    it("answers on the webhook path with a trailing slash", async () => {
        const res = await run(post(update, "/hook/"));

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ method: "answerInlineQuery" });
    });

    it.each([["/"], ["/other"], ["/hook/extra"], ["/hookx"], ["/hook//"]])(
        "responds 404 on %s",
        async (path) => {
            const res = await run(post(update, path));

            expect(res.status).toBe(404);
        },
    );

    it("responds 404 to everything without a webhook path", async () => {
        const res = await worker.fetch(post(update), {
            ...env,
            SECRET_PATH: "",
        });

        expect(res.status).toBe(404);
    });
});

describe("isWebhookPath", () => {
    it.each([
        ["/hook", "hook", true],
        ["/hook/", "hook", true],
        ["/hook", "/hook/", true],
        ["/hook/", "/hook", true],
        ["/", "", false],
        ["//", "/", false],
        ["/hook/extra", "hook", false],
        ["/Hook", "hook", false],
    ])("matches %s against %s: %s", (pathname, secretPath, expected) => {
        expect(isWebhookPath(pathname, secretPath)).toBe(expected);
    });
});
