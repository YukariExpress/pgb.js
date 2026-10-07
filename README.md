# Pythia Gata Bot

[![GPLv3 license](https://img.shields.io/badge/License-GPLv3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0.html)

## Description

Pgb is a Telegram inline bot running on Cloudflare Workers. It is a JavaScript
port of [YukariExpress/pgb](https://github.com/YukariExpress/pgb).

Type `@your_bot <question>` in any chat to get two results:

- **求签 / Divination**: draws 吉 or 凶 with an intensity from 极小 to 极大, or
  尚可.
- **Pia**: a cat (7/8) or a dog (1/8) slaps the query.

Results are deterministic for the same user, question, and 30-minute window.

Inline queries are answered directly in the webhook response, so the worker
never calls the Bot API and does not need the bot token. Telegram types come
from
[typescript-telegram-bot-api](https://github.com/Borodin/typescript-telegram-bot-api).

## Development

```sh
npm install
npm test
npx eslint .
npx tsc --noEmit
cp .dev.vars.example .dev.vars # then fill in the secrets
npm run dev
```

## Deployment

`SECRET_TOKEN` is a required secret. Since a new worker cannot have secrets set
before its first deployment, pass it in a file the first time, in the same
format as `.dev.vars.example`:

```sh
npx wrangler deploy --secrets-file <path-to-file>
```

Afterwards, deploy with `npx wrangler deploy`, and change the secret with
`npx wrangler secret put SECRET_TOKEN`.

The worker rejects requests without the `X-Telegram-Bot-Api-Secret-Token`
header set to `SECRET_TOKEN`. Then point the bot's webhook at the worker,
passing the same secret, with `TOKEN` set to the bot token in your shell:

```sh
curl "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d url="https://pgb.<your-subdomain>.workers.dev/" \
  -d secret_token="${SECRET_TOKEN}" \
  -d allowed_updates='["inline_query"]'
```

Inline mode must be enabled for the bot through @BotFather (`/setinline`).

Pushes to `main` are tested and deployed by GitHub Actions, which needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Author

- [Yishen Miao](https://github.com/mys721tx)

## License

[GNU General Public License, version 3](http://www.gnu.org/licenses/gpl-3.0.html)
