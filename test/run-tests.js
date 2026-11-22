// Dependency-free tests. Run with: npm test   (or: node test/run-tests.js)
// The AI service is mocked, so no API key or network is needed.

const assert = require("assert");
const core = require("../lib/coach-core");

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

const GOOD = JSON.stringify({
  scores: { clarity: 8, context: 6, specificity: 7, format: 5, constraints: 4 },
  strengths: ["Clear goal"],
  issues: ["No audience", "No length"],
  improved_prompt: "Write a 300-word blog post for beginners about healthy food.",
  tip: "Name the audience.",
});

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (k, v) => (res.headers[k] = v);
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
}

(async () => {
  console.log("Core logic");
  await test("rejects non-string and too-short prompts", () => {
    assert.strictEqual(core.validatePrompt(42).ok, false);
    assert.strictEqual(core.validatePrompt("hi").ok, false);
  });
  await test("rejects prompts over the limit", () => {
    assert.strictEqual(core.validatePrompt("a".repeat(core.MAX_CHARS + 1)).ok, false);
  });
  await test("accepts and trims a normal prompt", () => {
    const r = core.validatePrompt("  Write a poem about rain  ");
    assert.ok(r.ok);
    assert.strictEqual(r.prompt, "Write a poem about rain");
  });
  await test("request wraps the prompt in review tags", () => {
    const req = core.buildRequest("hello world", "m");
    assert.ok(req.messages[0].content.includes("<prompt_to_review>"));
    assert.strictEqual(req.model, "m");
  });
  await test("computes overall score out of 100", () => {
    assert.strictEqual(core.normalizeResult(GOOD).overall, 60);
  });
  await test("clamps out-of-range scores", () => {
    const text = JSON.stringify({ scores: { clarity: 99, context: -5 }, improved_prompt: "x y z" });
    const r = core.normalizeResult(text);
    assert.strictEqual(r.scores.clarity, 10);
    assert.strictEqual(r.scores.context, 0);
  });
  await test("handles JSON wrapped in markdown fences", () => {
    assert.strictEqual(core.normalizeResult("```json\n" + GOOD + "\n```").scores.clarity, 8);
  });
  await test("throws on non-JSON output", () => {
    assert.throws(() => core.normalizeResult("Sorry, I can't do that."));
  });
  await test("throws when improved prompt is missing", () => {
    assert.throws(() => core.normalizeResult(JSON.stringify({ scores: {} })));
  });

  console.log("API handler (mocked upstream)");
  const handler = require("../api/coach");
  const realFetch = global.fetch;
  const savedKey = process.env.API_KEY;

  await test("GET is rejected with 405", async () => {
    const res = fakeRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.strictEqual(res.statusCode, 405);
  });
  await test("missing API_KEY returns 503 and a helpful message", async () => {
    delete process.env.API_KEY;
    const res = fakeRes();
    await handler({ method: "POST", headers: {}, body: { prompt: "Write a poem" } }, res);
    assert.strictEqual(res.statusCode, 503);
    assert.ok(/API_KEY/.test(res.body.error));
  });

  process.env.API_KEY = "test-key-not-real";

  await test("invalid prompt returns 400", async () => {
    const res = fakeRes();
    await handler({ method: "POST", headers: { "x-forwarded-for": "1.1.1.1" }, body: { prompt: "" } }, res);
    assert.strictEqual(res.statusCode, 400);
  });
  await test("happy path returns a normalized result and sends the key only upstream", async () => {
    let seen;
    global.fetch = async (url, opts) => {
      seen = { url, opts };
      return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: GOOD }] }) };
    };
    const res = fakeRes();
    await handler({ method: "POST", headers: { "x-forwarded-for": "2.2.2.2" }, body: { prompt: "Write about food" } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.overall, 60);
    assert.strictEqual(seen.opts.headers["x-api-key"], "test-key-not-real");
    assert.ok(!JSON.stringify(res.body).includes("test-key-not-real"), "key must never be in the response");
  });
  await test("upstream 401 gives a safe message, not raw details", async () => {
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const res = fakeRes();
    await handler({ method: "POST", headers: { "x-forwarded-for": "3.3.3.3" }, body: { prompt: "Write about food" } }, res);
    assert.strictEqual(res.statusCode, 502);
    assert.ok(/rejected/.test(res.body.error));
  });
  await test("garbage model output returns 502", async () => {
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "nope" }] }) });
    const res = fakeRes();
    await handler({ method: "POST", headers: { "x-forwarded-for": "4.4.4.4" }, body: { prompt: "Write about food" } }, res);
    assert.strictEqual(res.statusCode, 502);
  });
  await test("11th request in a minute from one IP gets 429", async () => {
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: GOOD }] }) });
    let last;
    for (let i = 0; i < 11; i++) {
      last = fakeRes();
      await handler({ method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: { prompt: "Write about food" } }, last);
    }
    assert.strictEqual(last.statusCode, 429);
  });

  global.fetch = realFetch;
  if (savedKey === undefined) delete process.env.API_KEY;
  else process.env.API_KEY = savedKey;

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
