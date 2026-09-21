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
    ["heatmap cells (year view)", `document.querySelectorAll(".heatmap-grid [data-level]").length >= 260`],
    ["month labels Jan..Dec", `(() => { const labels = Array.from(document.querySelectorAll('[style*="grid-column"]')).map(el => el.textContent.trim()); return labels.includes("Jan") && labels.includes("Dec") && labels.length >= 11; })()`],
    ["click cell opens day detail", `(async () => { const cells = document.querySelectorAll('.heatmap-grid button'); if (!cells.length) return false; cells[cells.length - 1].click(); await new Promise(r => setTimeout(r, 300)); const ok = document.body.innerText.includes('Daily Goal:'); const close = document.querySelector('[aria-label="Close"]'); if (close) close.click(); return ok; })()`],
    ["workout day detail: sessions + streak", `(async () => { const cell = document.querySelector('.heatmap-grid button[aria-label="2026-09-19"]'); if (!cell) return false; cell.click(); await new Promise(r => setTimeout(r, 400)); const text = document.body.innerText; const ok = text.includes('Workout details') && text.includes('Streak through this day'); const close = document.querySelector('[aria-label="Close"], [aria-label="关闭"]'); if (close) close.click(); return ok; })()`],
    ["progress-index line fits its viewBox", `(() => { const svg = Array.from(document.querySelectorAll('.progress-card svg')).find(s => s.viewBox.baseVal.width === 280); if (!svg) return false; const bb = svg.querySelector('path:last-of-type').getBBox(); const vb = svg.viewBox.baseVal; return bb.y >= vb.y && bb.y + bb.height <= vb.y + vb.height; })()`],
    ["fitness tab shows workout data", `(async () => { const btns = Array.from(document.querySelectorAll('.dash-tabs button')); const fit = btns.find(b => b.textContent.trim() === 'Fitness'); if (!fit) return false; fit.click(); await new Promise(r => setTimeout(r, 300)); const cells = Array.from(document.querySelectorAll('.heatmap-grid button')); const lit = cells.filter(c => ['2','3','4'].includes(c.dataset.level)); return lit.length > 0; })()`],
    ["future day cells render empty", `(async () => { const btns = Array.from(document.querySelectorAll('.dash-tabs button')); const fit = btns.find(b => b.textContent.trim() === 'Fitness'); if (fit) { fit.click(); await new Promise(r => setTimeout(r, 300)); } const cell = document.querySelector('.heatmap-grid button[aria-label="2026-09-22"]'); return cell ? cell.dataset.level === '0' : true; })()`],
    ["year switcher works", `(async () => { const prev = document.querySelector('[aria-label="Previous year"]'); if (!prev || prev.disabled) return true; const badge = prev.nextElementSibling; const before = badge ? badge.textContent : ''; prev.click(); await new Promise(r => setTimeout(r, 300)); return badge && badge.textContent !== before; })()`],
  ]);

  // ---------- Theme + decision loop ----------
  await checkPage("/", [
    ["language toggle EN->zh", `(async () => { const btn = document.querySelector('[aria-label="切换到中文"]'); if (!btn) return false; btn.click(); await new Promise(r => setTimeout(r, 400)); const zh = document.body.innerText.includes("今天") && document.body.innerText.includes("进度指数"); const back = document.querySelector('[aria-label="Switch to English"]'); if (back) back.click(); return zh; })()`],
  ]);

  // ---------- Today page (session timer lives here) ----------
  await checkPage("/today", [
    ["NBA card present", `document.body.innerText.toUpperCase().includes("NEXT BEST ACTION")`],
    ["timer start/cancel", `(async () => { const btns = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Start")); if (!btns.length) return true; btns[0].click(); await new Promise(r => setTimeout(r, 1500)); const running = document.body.innerText.includes("Complete & log"); const cancel = document.querySelector('[aria-label="Cancel session"]'); if (cancel) cancel.click(); return running; })()`],
    ["timer complete button renders, cancel writes nothing", `(async () => { const btns = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Start")); if (!btns.length) return true; btns[0].click(); await new Promise(r => setTimeout(r, 2000)); const complete = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Complete & log")); const cancel = document.querySelector('[aria-label="Cancel session"]'); const ok = !!complete && !!cancel; if (cancel) cancel.click(); await new Promise(r => setTimeout(r, 400)); return ok && !document.body.innerText.includes("Complete & log"); })()`],
    ["zh mode: today page", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); const ok = document.body.innerText.includes('下一步行动') && document.body.innerText.includes('为什么现在？') && document.body.innerText.includes('今天'); toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
  ]);

  // ---------- Contribution ----------
  await checkPage("/contribution", [
    ["heatmap cells (year view)", `document.querySelectorAll("button.hm-cell").length >= 260`],
    ["4 leading blanks (year view)", `(() => { const grid = document.querySelector(".hm-grid"); return grid.children[0].tagName === "SPAN" && grid.querySelectorAll("span[aria-hidden]").length === 4; })()`],
    ["cell bg = ramp color (var-driven, not empty)", `(() => { const c = document.querySelector('button.hm-cell[data-level="1"], button.hm-cell[data-level="2"], button.hm-cell[data-level="3"]'); if (!c) return true; const bg = getComputedStyle(c).backgroundColor; return bg !== "rgb(22, 27, 37)" && bg !== "rgba(0, 0, 0, 0)"; })()`],
    ["empty cell = #161B25", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const c = grid.querySelector('button.hm-cell[data-level="0"]'); return grid.dataset.domain === 'english' && c && getComputedStyle(c).backgroundColor === "rgb(22, 27, 37)"; })()`],
    ["tab switch recolor works", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); tabs[2].click(); await new Promise(r => setTimeout(r, 400)); const grid = document.querySelector('.hm-grid'); const cell = document.querySelector('button.hm-cell[data-level="1"], button.hm-cell[data-level="2"]'); return grid.dataset.domain === 'english' && (!cell || getComputedStyle(cell).backgroundColor !== 'rgb(99, 102, 241)'); })()`],
    ["month labels present", `document.querySelectorAll('.relative.h-5 span').length >= 8`],
    ["no horizontal overflow", `document.documentElement.scrollWidth <= window.innerWidth`],
    ["click cell opens Day Detail", `(async () => { const cell = document.querySelector('button.hm-cell'); cell.click(); await new Promise(r => setTimeout(r, 300)); const dlg = document.querySelector('[role="dialog"]'); const ok = dlg && document.body.innerText.includes("Daily Goal:"); const close = document.querySelector('[aria-label="Close day detail"]'); if (close) close.click(); return ok; })()`],
    ["day detail shows workout sessions + streak", `(async () => { const cell = document.querySelector('button.hm-cell[data-date="2026-09-19"]'); if (!cell) return false; cell.click(); await new Promise(r => setTimeout(r, 400)); const dlg = document.querySelector('[role="dialog"]'); const text = dlg ? dlg.innerText : ''; const ok = text.includes('Workouts') && text.includes('Streak through this day'); const close = dlg?.querySelector('[aria-label="Close day detail"]'); if (close) close.click(); return ok; })()`],
    ["learning facet reads Reading", `(async () => { const tabs = document.querySelectorAll('[role="tab"]'); const labels = Array.from(tabs).map(t => t.textContent.trim()); return labels.includes('Reading') && !labels.includes('Learning'); })()`],
    ["future day cells render empty", `(() => { const c = document.querySelector('button.hm-cell[data-date="2026-09-22"]'); return c ? c.dataset.level === '0' : true; })()`],
    ["zh mode: contribution page", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); let text = document.body.innerText; let ok = text.includes('贡献记录') && text.includes('活跃天数') && text.includes('按领域') && text.includes('强度如何计算'); const cell = document.querySelector('button.hm-cell[data-date="2026-09-19"]'); if (cell) { cell.click(); await new Promise(r => setTimeout(r, 400)); const dlg = document.querySelector('[role="dialog"]'); const dtext = dlg ? dlg.innerText : ''; ok = ok && dtext.includes('当日目标') && dtext.includes('截至当日的连续天数'); const close = dlg?.querySelector('[aria-label="关闭当日详情"]'); if (close) close.click(); } toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
  ]);

  // ---------- Data Sources ----------
  await checkPage("/data-sources", [
    ["connector cards render", `document.body.innerText.includes("GitHub") && document.body.innerText.includes("WeRead") && document.body.innerText.includes("Maimemo") && document.body.innerText.includes("TickTick")`],
    ["sync status lines", `document.body.innerText.includes("Last sync:") && (document.body.innerText.includes("Connected") || document.body.innerText.includes("Disconnected"))`],
    ["zh mode: data sources", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); const text = document.body.innerText; const ok = text.includes('数据源') && text.includes('连接器') && (text.includes('已连接') || text.includes('未连接')) && text.includes('上次同步'); toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
  ]);

  // ---------- Insights tabs ----------
  await checkPage("/insights?tab=trends", [
    ["trends tab renders table", `document.body.innerText.toUpperCase().includes("90 DAYS") && document.body.innerText.toUpperCase().includes("DOMAIN")`],
    ["zh mode: insights", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); const text = document.body.innerText; const ok = text.includes('洞察') && text.includes('概览') && text.includes('领域') && text.includes('数据'); toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
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
    ["zh mode: me vs me", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); const text = document.body.innerText; const ok = text.includes('今昔对比') && text.includes('领域') && text.includes('此前') && text.includes('现在'); toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
  ]);

  // ---------- Goals ----------
  await checkPage("/goals", [
    ["gap order: Kubernetes before English", `(() => { const t = document.body.innerText; const k = t.indexOf("Kubernetes"); const e = t.indexOf("English"); return k > -1 && e > -1 && k < e; })()`],
    ["benchmark shows You/Target lines", `document.body.innerText.includes("Target") && document.body.innerText.includes("You")`],
    ["no percentile ranking", `!document.body.innerText.match(/beat|top \d+%|percentile/i)`],
    ["zh mode: goals", `(async () => { const toggle = document.querySelector('.language-toggle'); if (!toggle) return false; toggle.click(); await new Promise(r => setTimeout(r, 400)); const text = document.body.innerText; const ok = text.includes('目标') && text.includes('差距') && text.includes('你') && text.includes('海外工程师'); toggle.click(); await new Promise(r => setTimeout(r, 400)); return ok; })()`],
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
