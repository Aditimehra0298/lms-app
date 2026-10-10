<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Put Node 22.22+ from `/home/ubuntu/.nvm/versions/node/v22.*` ahead of `/exec-daemon/node` on `PATH`. The bundled Node 22.14 rejects `NODE_OPTIONS=--use-system-ca`, and `scripts/postinstall.mjs` sets that flag, so `npm ci` fails when `/exec-daemon/node` is first.
- MySQL 8 is local on `127.0.0.1:3306` (database `sft_lms`, user `lms`). Install and boot write `DATABASE_URL` to `.env` for Prisma and `.env.local` for Next.js. Do not commit those files.
- Boot starts MySQL, runs `npx prisma db push --skip-generate`, then holds `npm run dev` in the foreground on http://127.0.0.1:3000. MySQL health is `GET /api/health/mysql`.
- Local email OTP does not use SMTP (`OTP_USE_SMTP=false`). `POST /api/auth/otp/send` returns `devCode` for registration.
- Lint is `npm run lint`. There is no test script. `npx tsc --noEmit` reports existing type errors. `npm run build` skips type checking. That build also fails while collecting `/api/chat-assistant` unless `OPENAI_API_KEY` is any non-empty value; the dev server does not need a real key.
