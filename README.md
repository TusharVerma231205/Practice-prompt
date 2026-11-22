# Prompt Coach

Paste a prompt and get an honest score out of 100, what works, what to fix, and a stronger rewrite you can copy.

Built for the Prompt Engineering capstone (Build, GitHub, API, Vercel) by Tushar Verma.

- **Live app:** `<PASTE YOUR VERCEL PRODUCTION URL HERE>`
- **Repository:** `<PASTE YOUR GITHUB REPO URL HERE>`

## Overview

Most weak AI answers come from weak prompts. Prompt Coach reviews a prompt against five criteria, each scored 0 to 10:

| Criterion | Question it answers |
|---|---|
| Clarity | Is the goal unambiguous? |
| Context | Does it give the background the AI needs? |
| Specificity | Are the details concrete rather than vague? |
| Format | Does it say what the output should look like? |
| Constraints | Does it state limits and things to avoid? |

The five scores add up to an overall score out of 100.

## Features

- Score ring and per-criterion bars (the dashboard)
- "What works" and "What to fix" lists
- A rewritten, improved prompt with a one-click **Copy** button
- Example prompts (vague, strong, too short) to try quickly
- Recent reviews saved in the browser (localStorage only, never sent anywhere)
- Input checks: 5 to 2000 characters, clear error messages
- Works on phone and desktop

## Tools and tech stack

| Layer | Tool |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (`public/`) |
| Backend | Vercel serverless function in Node.js (`api/coach.js`) |
| AI provider | Anthropic API, Messages endpoint (model `claude-sonnet-5-5` by default) |
| Hosting | Vercel, deployed from GitHub |
| Tests | Plain Node.js, no dependencies (`test/run-tests.js`) |
| AI assistance | Claude was used to plan, write and review the code, docs and pull request description |

## How it works

```
User -> Browser UI -> POST /api/coach -> Anthropic API -> JSON result -> Dashboard
                      (API_KEY lives here, server only)
```

1. The browser sends the prompt to `/api/coach`.
2. The serverless function validates it, adds the API key from the `API_KEY` environment variable and calls the Anthropic API.
3. The model replies with JSON. The function checks and cleans it (scores clamped to 0 to 10, overall calculated on the server) and returns it.
4. The browser draws the dashboard.

The key is never in the frontend code, the repository or the browser.

## Project structure

```
prompt-coach/
  public/            index.html, style.css, app.js (static frontend)
  api/coach.js       serverless function (calls the AI API)
  lib/coach-core.js  validation, request building, response parsing
  server.js          tiny local dev server (not used on Vercel)
  test/              automated tests
  vercel.json        tells Vercel to serve public/
  README.md  audit.md  Space.md  PR_DESCRIPTION.md
  .env.example       shows the variable name, with no real key
```

## Setup (run locally)

Requires Node.js 18 or newer.

```bash
git clone <your-repo-url>
cd prompt-coach
cp .env.example .env        # then put your real key in .env (never commit it)
```

Get a key from the Anthropic Console (console.anthropic.com), under API Keys. Then start the app with the key in the environment:

```bash
# macOS / Linux
API_KEY=your_key_here node server.js

# Windows PowerShell
$env:API_KEY="your_key_here"; node server.js
```

Open http://localhost:3000.

Run the tests (no key needed, the AI service is mocked):

```bash
npm test
```

## Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel choose **Add New > Project** and import the repository.
3. Framework Preset: **Other**. Leave the build command empty. The output directory comes from `vercel.json` (`public`).
4. Open **Settings > Environment Variables** and add `API_KEY` with your real key. Select Production, Preview and Development.
5. Click **Deploy**, then open the production URL and test a review.

If you add or change the variable after deploying, redeploy so the change takes effect.

## Security notes

- The API key exists only as an environment variable on Vercel (and in your local `.env`, which is git-ignored).
- `.gitignore` blocks `.env` files. Only `.env.example` (no real value) is committed.
- The function limits input size, rate-limits requests per IP (best effort), and never returns upstream error details to the browser.
- The user's prompt is wrapped in tags and the model is told to treat it as text to review, which reduces prompt-injection risk.

See [audit.md](audit.md) for the full check list and known issues.

## Known limitations

- Scores come from an AI model, so the same prompt can score a point or two differently between runs.
- The rate limit is per server instance, so it is a basic safeguard, not a guarantee.
- Review history is stored only in the current browser.
