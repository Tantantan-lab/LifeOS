// Tiny static server with GitHub-Pages-style extensionless resolution:
// /path → /path.html, and directories serve their index.html.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = "/tmp/pages";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  let file = path.resolve(ROOT, "." + p);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(404); res.end("not found"); return; }
  let st = null;
  try { st = fs.statSync(file); } catch { /* fall through */ }
  if (st && st.isDirectory()) {
    const idx = path.join(file, "index.html");
    file = fs.existsSync(idx) ? idx : (fs.existsSync(file + ".html") ? file + ".html" : null);
  } else if (!st && fs.existsSync(file + ".html")) {
    file += ".html";
  } else if (!st || !st.isFile()) {
    file = null;
  }
  if (!file) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(8090, "127.0.0.1", () => console.log("serving /tmp/pages on 127.0.0.1:8090"));
