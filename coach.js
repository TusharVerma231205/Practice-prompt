// Vercel serverless function: POST /api/coach
// The API key is read from the API_KEY environment variable and never leaves the server.

const { validatePrompt, buildRequest, normalizeResult, extractText } = require("../lib/coach-core");

const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";

// Best-effort rate limit (per server instance): 10 requests per minute per IP.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: "The server is missing its API_KEY environment variable. See the README setup steps." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "local").split(",")[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const checked = validatePrompt(body && body.prompt);
  if (!checked.ok) return res.status(400).json({ error: checked.error });

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildRequest(checked.prompt, MODEL)),
    });

    if (!upstream.ok) {
      // Log details on the server only; give the browser a generic message.
      console.error("Upstream API error", upstream.status);
      const message =
        upstream.status === 401
          ? "The API key was rejected. Check the API_KEY value in your environment settings."
          : "The AI service could not complete the request. Please try again.";
      return res.status(502).json({ error: message });
    }

    const data = await upstream.json();
    const result = normalizeResult(extractText(data));
    return res.status(200).json(result);
  } catch (err) {
    console.error("Coach error:", err && err.message);
    return res.status(502).json({ error: "Something went wrong while reviewing your prompt. Please try again." });
  }
};
