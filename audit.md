# Audit

Checks, tests, known issues and security notes for Prompt Coach.

## 1. Automated tests

Run `npm test`. The AI service is mocked, so these run without a key or internet.

Last run: **16 passed, 0 failed.**

| Area | What is checked |
|---|---|
| Input validation | Rejects non-text, too-short (under 5 characters) and too-long (over 2000) prompts; trims whitespace |
| Request building | The user's prompt is wrapped in `<prompt_to_review>` tags |
| Response parsing | Overall score = sum of five scores x 2; scores clamped to 0 to 10; JSON inside markdown fences is accepted; non-JSON and missing improved prompt are rejected |
| API handler | GET returns 405; missing `API_KEY` returns 503 with a helpful message; bad input returns 400; success returns a clean result; the key is sent only to the AI provider and never appears in the response; upstream 401 and garbage output return 502 with safe messages; the 11th request in a minute from one IP returns 429 |

## 2. Manual checks

Done during development against a local server:

- [x] Home page, CSS and JS load (HTTP 200)
- [x] Path traversal request (`/../server.js`) is blocked
- [x] `POST /api/coach` without a key returns the 503 message
- [x] `GET /api/coach` returns 405
- [x] In Chrome (desktop 1280 px and phone 390 px wide): example chips fill the box, the review button shows the score ring, five bars, both lists, the improved prompt and a history row, with no console errors (AI response mocked)

To complete after deployment (tick these yourself and keep the date):

- [ ] Production URL opens
- [ ] A real review returns a score, feedback and an improved prompt
- [ ] "Copy improved prompt" and "Use it as my prompt" work
- [ ] "Too short" example shows a sensible message or low score
- [ ] Reloading the page keeps the Recent reviews list
- [ ] Works on a phone
- [ ] `git log -p` and the GitHub file list show no `.env` and no key

## 3. Security notes

| Risk | How it is handled |
|---|---|
| API key leaks | Stored only in the `API_KEY` environment variable (Vercel settings and a local, git-ignored `.env`). Frontend code never contains it. Only `.env.example` with a placeholder is committed |
| Key leaks through errors | Upstream error bodies are logged on the server only; the browser gets generic messages |
| Abuse and cost | Prompt length limit (2000 characters), `max_tokens` capped at 1200, per-IP rate limit of 10 requests per minute |
| Prompt injection | User text is wrapped in tags and the system prompt says to treat it as data. The model's reply is parsed as JSON and rebuilt field by field, so extra text from the model is dropped |
| Cross-site scripting | The frontend writes all results with `textContent`, never `innerHTML` |
| Local data | History stays in the browser's localStorage and is not sent to the server |

## 4. Known issues and limits

1. **Score variation.** An AI model produces the scores, so repeated runs of the same prompt may differ slightly.
2. **Basic rate limit.** The counter lives in memory on one serverless instance, so it resets when the instance restarts and is not shared between instances. Use a shared store (for example a Redis-based limiter) for strong protection.
3. **No user accounts.** Anyone with the URL can use the app and spend the API credit. Set a spending limit in the AI provider dashboard.
4. **English-first.** The scoring prompt is written in English. Other languages may work but are not tested.
5. **Rare bad output.** If the model returns unusable JSON the user sees a "try again" message.
6. **No end-to-end test with a live key in the automated suite.** The automated tests mock the provider on purpose, so they never spend credit.

## 5. Possible next steps

- Shared rate limiting
- Save history to a database after sign-in
- Side-by-side "before and after" comparison view
- Support for more languages
