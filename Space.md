# Space.md: Prompt Coach

## Project title and objective

**Prompt Coach** helps people write better prompts for AI assistants. The user pastes a prompt and gets a score out of 100, what works, what to fix, and an improved rewrite they can copy.

**Objective:** deliver a working, deployed web app through the full pipeline: Build, GitHub, documentation, Pull Request, API key in environment variables, Vercel deployment.

Student: Tushar Verma | Roll / enrolment number: `<ADD YOURS>`

## Links

| Item | Link |
|---|---|
| Live app (Vercel production URL) | `<PASTE URL>` |
| GitHub repository | `<PASTE URL>` |
| Pull Request | `<PASTE PR URL>` |

## Tools and tech stack

- HTML, CSS, JavaScript (frontend)
- Node.js serverless function on Vercel (backend)
- GitHub (version control and pull request)
- Vercel (deployment)
- AI assistance: Claude, used to plan, write and review code and docs, and to draft the PR description

## API / provider

- **Provider:** Anthropic API
- **Endpoint category:** Messages (text generation)
- **Purpose:** read the user's prompt, score it on five criteria and write an improved version
- **Where the key lives:** the `API_KEY` environment variable in Vercel (Project Settings > Environment Variables) and a git-ignored local `.env`. The key is not in this repository and is never shown in screenshots.

## System design / workflow

```
User -> Browser UI -> /api/coach (serverless function) -> Anthropic API -> JSON result -> Dashboard
                      holds API_KEY (server only)
```

| Step | What happens |
|---|---|
| 1. User | Types or pastes a prompt |
| 2. UI | `public/app.js` checks it is not empty and sends it with `fetch` |
| 3. Backend | `api/coach.js` validates length, applies a rate limit, adds the secret key |
| 4. AI service | The model scores the prompt and returns JSON |
| 5. Output | The backend cleans the JSON and the UI draws the score ring, bars, feedback and improved prompt |

## Setup steps

1. Clone the repository and run `cp .env.example .env`.
2. Add your own key to `.env` (never commit it).
3. Run `API_KEY=your_key node server.js` and open http://localhost:3000.
4. Run `npm test` to check everything.

Full details are in [README.md](README.md).

## Deployment steps

1. Push the repository to GitHub.
2. Import it in Vercel with Framework Preset **Other** and an empty build command.
3. Add `API_KEY` under Settings > Environment Variables.
4. Deploy, open the production URL and test a review.

## Pull Request

PR link: `<PASTE PR URL>`. The description (what changed, why, tests, screenshots) was drafted with AI and checked by me. The text is in [PR_DESCRIPTION.md](PR_DESCRIPTION.md).

## Screenshots

Replace each file below with your own real screenshot (see the capture guide).

| # | Screenshot | Caption |
|---|---|---|
| 1 | ![Working app](docs/screenshots/1-working-app.png) | The app after reviewing a prompt: score ring, criteria bars, feedback and improved prompt |
| 2 | ![Repository files](docs/screenshots/2-github-files.png) | GitHub repository file list showing code, README.md, audit.md and Space.md |
| 3 | ![README, audit and Space](docs/screenshots/3-docs.png) | README.md, audit.md and Space.md present in the repository |
| 4 | ![Pull request](docs/screenshots/4-pull-request.png) | Pull Request with the AI-assisted description |
| 5 | ![API configuration](docs/screenshots/5-api-config.png) | Vercel Environment Variables page with `API_KEY` value hidden |
| 6 | ![Vercel deployment](docs/screenshots/6-vercel-deployment.png) | Vercel deployment ready, showing the production URL |
