// Tiny local dev server (no dependencies): serves public/ and routes POST /api/coach.
// Run with:  API_KEY=your_key node server.js     then open http://localhost:3000
// On Vercel this file is not used; Vercel serves public/ and runs api/coach.js itself.

const http = require("http");
const fs = require("fs");
const path = require("path");
const handler = require("./api/coach");

const PUBLIC_DIR = path.join(__dirname, "public");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/coach") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 50_000) req.destroy();
    });
    req.on("end", () => {
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        req.body = null;
      }
      // Minimal shim so the Vercel-style handler works with plain Node.
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (obj) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(obj));
      };
      handler(req, res);
    });
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    res.setHeader("Content-Type", TYPES[path.extname(filePath)] || "application/octet-stream");
    res.end(content);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Prompt Coach running at http://localhost:${port}`));
