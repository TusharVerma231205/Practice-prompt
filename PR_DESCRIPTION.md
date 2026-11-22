# Add API-powered prompt review, docs and deployment config

## What changed

- Added a serverless endpoint `POST /api/coach` that sends the user's prompt to the Anthropic API and returns a score, feedback and an improved prompt
- Added the frontend dashboard (score ring, five criteria bars, strengths, fixes, copy button, recent reviews)
- Moved validation and response parsing into `lib/coach-core.js` so it can be tested without a network
- Added `README.md`, `audit.md`, `Space.md`, `.env.example` and `.gitignore`
- Added `vercel.json` so Vercel serves the `public/` folder
- Added 16 automated tests

## Why

The first version could only show a static page. The app needs to call an AI service to give real feedback, and that must be done on the server so the API key is never exposed in the browser or in GitHub.

## How the key is protected

- Read from the `API_KEY` environment variable only
- `.env` is in `.gitignore`; `.env.example` contains a placeholder
- Upstream error details are logged on the server and not returned to the browser

## How it was tested

- `npm test`: 16 passed, 0 failed (AI service mocked)
- Local run: page and assets load, GET on the API returns 405, missing key returns a clear 503 message, path traversal is blocked
- Browser check at desktop and phone width with no console errors
- After deploying: real review tested on the production URL (see audit.md checklist)

## Screenshots

<!-- Drag your own screenshots into this PR description on GitHub -->
1. Working app
2. Vercel environment variables page (value hidden)
3. Vercel deployment ready

## Checklist

- [x] No secrets or `.env` files committed
- [x] README.md, audit.md and Space.md included
- [x] Tests pass
- [ ] Production URL tested after merge
