// Prompt Coach frontend. It talks only to /api/coach. No API key exists in this file.

const $ = (id) => document.getElementById(id);
const LABELS = {
  clarity: "Clarity",
  context: "Context",
  specificity: "Specificity",
  format: "Format",
  constraints: "Constraints",
};
const HISTORY_KEY = "promptCoachHistory";
const MAX_HISTORY = 8;

const promptEl = $("prompt");
const goBtn = $("go");
const statusEl = $("status");
let lastImproved = "";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function updateCount() {
  $("count").textContent = `${promptEl.value.length} / 2000`;
}

function list(el, items, fallback) {
  el.replaceChildren();
  const values = items.length ? items : [fallback];
  for (const text of values) {
    const li = document.createElement("li");
    li.textContent = text;
    el.appendChild(li);
  }
}

function renderResult(r) {
  $("empty").hidden = true;
  $("result").hidden = false;

  $("overall").textContent = r.overall;
  const ring = $("ring");
  ring.style.setProperty("--pct", r.overall);
  ring.style.setProperty("--ring-color", r.overall >= 70 ? "#1b6b5a" : r.overall >= 40 ? "#b45309" : "#b42318");
  ring.setAttribute("aria-label", `Overall score ${r.overall} out of 100`);

  const bars = $("bars");
  bars.replaceChildren();
  for (const [key, label] of Object.entries(LABELS)) {
    const value = r.scores[key] ?? 0;
    const row = document.createElement("div");
    row.className = "bar";

    const name = document.createElement("span");
    name.textContent = label;

    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${value * 10}%`;
    track.appendChild(fill);

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `${value}/10`;

    row.append(name, track, num);
    bars.appendChild(row);
  }

  list($("strengths"), r.strengths, "Nothing stands out yet.");
  list($("issues"), r.issues, "No major problems found.");
  $("improved").textContent = r.improved_prompt;
  $("tip").textContent = r.tip || "Name the audience, the format and the limits.";
  lastImproved = r.improved_prompt;
}

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    /* storage can be blocked; the app still works without it */
  }
}

function renderHistory() {
  const items = loadHistory();
  const ul = $("history");
  ul.replaceChildren();
  $("history-empty").hidden = items.length > 0;
  items.forEach((item) => {
    const li = document.createElement("li");
    const score = document.createElement("span");
    score.className = "score";
    score.textContent = item.overall;
    const text = document.createElement("span");
    text.className = "text";
    text.textContent = item.prompt;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Open";
    btn.addEventListener("click", () => {
      promptEl.value = item.prompt;
      updateCount();
      renderResult(item.result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    li.append(score, text, btn);
    ul.appendChild(li);
  });
}

async function review() {
  const prompt = promptEl.value.trim();
  if (prompt.length < 5) {
    setStatus("Write at least a few words first.", true);
    return;
  }

  goBtn.disabled = true;
  setStatus("Reviewing your prompt...");

  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

    renderResult(data);
    setStatus("Done.");
    saveHistory([{ prompt, overall: data.overall, result: data }, ...loadHistory()]);
    renderHistory();
  } catch (err) {
    setStatus(err.message || "Network problem. Please try again.", true);
  } finally {
    goBtn.disabled = false;
  }
}

promptEl.addEventListener("input", updateCount);
goBtn.addEventListener("click", review);
promptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") review();
});

$("clear").addEventListener("click", () => {
  promptEl.value = "";
  updateCount();
  promptEl.focus();
});

document.querySelectorAll("#examples .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    promptEl.value = chip.dataset.text;
    updateCount();
    promptEl.focus();
  });
});

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastImproved);
    setStatus("Copied to clipboard.");
  } catch {
    setStatus("Copy failed. Select the text and copy it manually.", true);
  }
});

$("use").addEventListener("click", () => {
  promptEl.value = lastImproved;
  updateCount();
  promptEl.focus();
  setStatus("Improved prompt loaded. Edit it or review it again.");
});

$("clear-history").addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

updateCount();
renderHistory();
