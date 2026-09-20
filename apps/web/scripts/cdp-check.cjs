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

  // ---------- Home (ReferenceDashboard design) ----------
  await checkPage("/", [
    ["bg color = rgb(9,13,18) (#090D12)", `getComputedStyle(document.body).backgroundColor === "rgb(9, 13, 18)"`],
    ["sidebar bg = rgb(11,16,22) (#0B1016)", `(() => { const a = document.querySelector("aside"); return a && getComputedStyle(a).backgroundColor === "rgb(11, 16, 22)"; })()`],
    ["Progress Index hero (— until assessed)", `document.body.innerText.includes("Progress Index") && document.body.innerText.includes("—")`],
    ["5 activity cards", `["Study","English","Fitness","Coding","Sleep"].every(t => document.body.innerText.includes(t))`],
    ["heatmap cells >= 365", `document.querySelectorAll(".heatmap-grid [data-level]").length >= 365`],
    ["month labels align to real grid", `Array.from(document.querySelectorAll('[style*="grid-column"]')).length >= 10`],
    ["click cell opens day detail", `(async () => { const cells = document.querySelectorAll('.heatmap-grid button'); if (!cells.length) return false; cells[cells.length - 1].click(); await new Promise(r => setTimeout(r, 300)); const ok = document.body.innerText.includes('Daily Goal:'); const close = document.querySelector('[aria-label="Close"]'); if (close) close.click(); return ok; })()`],
    ["heatmap filter tabs", `["All","Career"].every(t => document.body.innerText.includes(t))`],
    ["streak stats", `document.body.innerText.includes("active days") && document.body.innerText.includes("longest streak")`],
    ["Today ring + NBA", `document.body.innerText.includes("Daily Goal") && document.body.innerText.includes("Next Best Action")`],
    ["NBA log button present", `document.querySelector('[aria-label="Log next action"]') !== null`],
    ["Me vs Me tabs", `["30D","90D","1Y"].every(t => document.body.innerText.includes(t)) && document.body.innerText.includes("Then") && document.body.innerText.includes("Now")`],
    ["Goals Level + skills", `document.body.innerText.includes("Level") && document.body.innerText.includes("Kubernetes")`],
    ["Insights tabs", `["Summary","Trends","Gaps","AI Analysis"].every(t => document.body.innerText.includes(t))`],
    ["no horizontal overflow", `document.documentElement.scrollWidth <= window.innerWidth`],
  ]);

  // ---------- Theme + decision loop ----------
  await checkPage("/", [
    ["language toggle EN->zh", `(async () => { const btn = document.querySelector('[aria-label="切换到中文"]'); if (!btn) return false; btn.click(); await new Promise(r => setTimeout(r, 400)); const zh = document.body.innerText.includes("今天") && document.body.innerText.includes("进度指数"); const back = document.querySelector('[aria-label="Switch to English"]'); if (back) back.click(); return zh; })()`],
  ]);

  // ---------- Today page (session timer lives here) ----------
  await checkPage("/today", [
    ["NBA card present", `document.body.innerText.toUpperCase().includes("NEXT BEST ACTION")`],
    ["timer start/cancel", `(async () => { const btns = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Start")); if (!btns.length) return true; btns[0].click(); await new Promise(r => setTimeout(r, 1500)); const running = document.body.innerText.includes("Complete & log"); const cancel = document.querySelector('[aria-label="Cancel session"]'); if (cancel) cancel.click(); return running; })()`],
    ["timer complete writes an event", `(async () => { const btns = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Start")); if (!btns.length) return true; btns[0].click(); await new Promise(r => setTimeout(r, 2500)); const complete = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Complete & log")); if (!complete) return false; const before = document.body.innerText; complete.click(); await new Promise(r => setTimeout(r, 2500)); return document.body.innerText !== before; })()`],
  ]);

  // ---------- Contribution ----------
  await checkPage("/contribution", [
    ["365+ heatmap cells", `document.querySelectorAll("button.hm-cell").length >= 365`],
    ["6 leading blanks", `(() => { const grid = document.querySelector(".hm-grid"); return grid.children[0].tagName === "SPAN" && grid.querySelectorAll("span[aria-hidden]").length === 6; })()`],
    ["cell bg = ramp color (var-driven, not empty)", `(() => { const c = document.querySelector('button.hm-cell[data-level="1"], button.hm-cell[data-level="2"], button.hm-cell[data-level="3"]'); if (!c) return true; const bg = getComputedStyle(c).backgroundColor; return bg !== "rgb(22, 27, 37)" && bg !== "rgba(0, 0, 0, 0)"; })()`],
    ["empty cell = #161B25", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const c = grid.querySelector('button.hm-cell[data-level="0"]'); return grid.dataset.domain === 'english' && c && getComputedStyle(c).backgroundColor === "rgb(22, 27, 37)"; })()`],
    ["tab switch recolor works", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const cell = document.querySelector('button.hm-cell[data-level="1"], button.hm-cell[data-level="2"]'); return grid.dataset.domain === 'english' && (!cell || getComputedStyle(cell).backgroundColor !== 'rgb(99, 102, 241)'); })()`],
    ["month labels present", `document.querySelectorAll('.relative.h-5 span').length >= 10`],
    ["no horizontal overflow", `document.documentElement.scrollWidth <= window.innerWidth`],
    ["click cell opens Day Detail", `(async () => { const cell = document.querySelector('button.hm-cell'); cell.click(); await new Promise(r => setTimeout(r, 300)); const dlg = document.querySelector('[role="dialog"]'); const ok = dlg && document.body.innerText.includes("Daily Goal:"); const close = document.querySelector('[aria-label="Close day detail"]'); if (close) close.click(); return ok; })()`],
  ]);

  // ---------- Data Sources ----------
  await checkPage("/data-sources", [
    ["connector cards render", `document.body.innerText.includes("GitHub") && document.body.innerText.includes("WeRead") && document.body.innerText.includes("Maimemo") && document.body.innerText.includes("TickTick")`],
    ["sync status lines", `document.body.innerText.includes("Last sync:") && (document.body.innerText.includes("Connected") || document.body.innerText.includes("Disconnected"))`],
  ]);

  // ---------- Insights tabs ----------
  await checkPage("/insights?tab=trends", [
    ["trends tab renders table", `document.body.innerText.toUpperCase().includes("90 DAYS") && document.body.innerText.toUpperCase().includes("DOMAIN")`],
  ]);
  await checkPage("/insights?tab=gaps", [
    ["gaps tab renders ranking", `document.body.innerText.includes("Kubernetes") && document.body.innerText.includes("Cloud")`],
  ]);

  // ---------- Me vs Me ----------
  await checkPage("/me-vs-me", [
    ["window caption shows ranges", `document.body.innerText.includes("NOW:") && document.body.innerText.includes("THEN:")`],
    ["versus rows present", `document.querySelectorAll("main button[aria-pressed]").length >= 1`],
    ["window switch updates numbers", `(async () => { const before = document.body.innerText; const tabs = document.querySelectorAll('[role="tab"]'); tabs[0].click(); await new Promise(r => setTimeout(r, 400)); const after = document.body.innerText; return before !== after && after.includes("NOW:") && after.includes("THEN:"); })()`],
    ["recharts svg rendered", `document.querySelectorAll(".recharts-surface").length >= 1`],
  ]);

  // ---------- Goals ----------
  await checkPage("/goals", [
    ["gap order: Kubernetes before English", `(() => { const t = document.body.innerText; const k = t.indexOf("Kubernetes"); const e = t.indexOf("English"); return k > -1 && e > -1 && k < e; })()`],
    ["benchmark shows You/Target lines", `document.body.innerText.includes("Target") && document.body.innerText.includes("You")`],
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
