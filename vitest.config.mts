import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Satisfies wrangler's required-secrets check; .dev.vars still takes precedence.
process.env.SECRET_TOKEN ??= "test-secret-token";

export default defineConfig({
    plugins: [
        cloudflareTest({
            wrangler: { configPath: "./wrangler.toml" },
        }),
    ],
    test: {},
});
