// CDP-based UI verification for LifeOS M1 — no browser automation deps,
// uses Node's built-in WebSocket + fetch against headless Chrome.
const { spawn } = require("node:child_process");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  const chrome = spawn(CHROME, [
    "--headless", "--disable-gpu", "--remote-debugging-port=9222",
    "--window-size=1440,1200", "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try { await fetch("http://localhost:9222/json/version"); return chrome; } catch { await sleep(500); }
  }
  throw new Error("chrome did not start");
}

async function newPage(url) {
  const res = await fetch(`http://localhost:9222/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const { webSocketDebuggerUrl, id } = await res.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
    else if (data.method) events.push(data);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  return { ws, send, events, id, close: () => ws.close() };
}

async function evaluate(page, expr) {
  const res = await page.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (res.result.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result.result.value;
}

function report(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  →  " + detail : ""}`);
}

async function main() {
  const chrome = await launchChrome();
  const results = [];

  async function checkPage(path, checks) {
    const page = await newPage(BASE + path);
    await page.send("Runtime.enable");
    await page.send("Log.enable");
    // wait for hydration
    await sleep(2500);
    for (const [name, expr] of checks) {
      try {
        const value = await evaluate(page, expr);
        results.push([name, value]);
      } catch (e) {
        results.push([name, `EVAL ERROR: ${String(e).slice(0, 120)}`]);
      }
    }
    // console errors
    const errors = page.events.filter(
      (e) => e.method === "Runtime.exceptionThrown" ||
        (e.method === "Log.entryAdded" && e.params.entry.level === "error")
    );
    results.push([`console errors on ${path}`, errors.length === 0, JSON.stringify(errors.map((e) => e.params?.entry?.text || e.params?.exceptionDetails?.text).slice(0, 3))]);
    page.close();
    await sleep(300);
  }

  // ---------- Home ----------
  await checkPage("/", [
    ["bg color = rgb(11,14,20) (#0B0E14)", `getComputedStyle(document.body).backgroundColor === "rgb(11, 14, 20)"`],
    ["sidebar bg = rgb(17,21,29) (#11151D)", `(() => { const s = document.querySelector("aside"); return s && getComputedStyle(s).backgroundColor === "rgb(17, 21, 29)"; })()`],
    ["hero shows 72", `document.body.innerText.includes("72") && document.body.innerText.includes("OVERSEAS ENGINEER")`],
    ["brand progress fill = rgb(99,102,241) (#6366F1)", `(() => { const b = document.querySelector(".bg-brand"); return b && getComputedStyle(b).backgroundColor === "rgb(99, 102, 241)"; })()`],
    ["5 domain cards", `document.querySelectorAll("main .grid > *").length > 0 && (document.body.innerText.match(/Learning|English|Coding|Health|Productivity/g) || []).length >= 5`],
    ["no horizontal overflow", `document.documentElement.scrollWidth <= window.innerWidth`],
    ["no Life Score wording", `!document.body.innerText.includes("Life Score")`],
  ]);

  // ---------- Contribution ----------
  await checkPage("/contribution", [
    ["365+ heatmap cells", `document.querySelectorAll("button.hm-cell").length >= 365`],
    ["6 leading blanks", `(() => { const grid = document.querySelector(".hm-grid"); return grid.children[0].tagName === "SPAN" && grid.querySelectorAll("span[aria-hidden]").length === 6; })()`],
    ["cell bg = ramp color (var-driven, not empty)", `(() => { const c = document.querySelector('button.hm-cell[data-level="4"]'); const bg = getComputedStyle(c).backgroundColor; return c && bg !== "rgb(22, 27, 37)" && bg !== "rgba(0, 0, 0, 0)"; })()`],
    ["empty cell = #161B25", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const c = grid.querySelector('button.hm-cell[data-level="0"]'); return grid.dataset.domain === 'english' && c && getComputedStyle(c).backgroundColor === "rgb(22, 27, 37)"; })()`],
    ["tab switch recolor works", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const cell = document.querySelector('button.hm-cell[data-level="4"]'); return grid.dataset.domain === 'english' && getComputedStyle(cell).backgroundColor !== 'rgb(99, 102, 241)'; })()`],
    ["month labels present", `document.querySelectorAll('.relative.h-5 span').length >= 10`],
    ["no horizontal overflow", `document.documentElement.scrollWidth <= window.innerWidth`],
  ]);

  // ---------- Me vs Me ----------
  await checkPage("/me-vs-me", [
    ["window caption shows ranges", `document.body.innerText.includes("NOW:") && document.body.innerText.includes("THEN:")`],
    ["5 versus rows", `document.querySelectorAll("main button[aria-pressed]").length === 5`],
    ["window switch updates numbers", `(async () => { const before = document.body.innerText; const tabs = document.querySelectorAll('[role="tab"]'); tabs[0].click(); await new Promise(r => setTimeout(r, 400)); const after = document.body.innerText; return before !== after && after.includes("NOW:") && after.includes("THEN:"); })()`],
    ["recharts svg rendered", `document.querySelectorAll(".recharts-surface").length >= 1`],
  ]);

  // ---------- Goals ----------
  await checkPage("/goals", [
    ["gap order: Kubernetes before English", `(() => { const t = document.body.innerText; const k = t.indexOf("Kubernetes"); const e = t.indexOf("English"); return k > -1 && e > -1 && k < e; })()`],
    ["benchmark shows You/Target/Gap", `document.body.innerText.includes("Target 85") && document.body.innerText.includes("Gap 35")`],
    ["no percentile ranking", `!document.body.innerText.match(/beat|top \d+%|percentile/i)`],
  ]);

  chrome.kill();
  let fails = 0;
  for (const r of results) {
    const [name, value, detail] = r;
    if (value === true) report(name, true);
    else { fails++; report(name, false, String(value).slice(0, 140) + (detail ? " " + detail : "")); }
  }
  console.log(fails === 0 ? "\nALL UI CHECKS PASSED" : `\n${fails} CHECKS FAILED`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL", e); process.exit(2); });
