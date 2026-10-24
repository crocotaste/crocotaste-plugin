import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const USAGE =
  "crocotaste serve <file-or-dir> [--open] [--port N] [--idle-minutes N]\n";

const HOST = "127.0.0.1";
const CLIENT_PATH = new URL("../lib/preview-client.js", import.meta.url);
const SNIPPET = '<script src="/__crocotaste/reload.js"></script>';
const DEBOUNCE_MS = 150;
const KEEP_ALIVE_MS = 25_000;
const PROBE_MS = 500;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// The preview only ever shows the user's own files to the user's own browser;
// these keep other origins from embedding or sniffing them.
const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};

const IGNORED = /(^|[\\/])(node_modules|\.git)([\\/]|$)/;

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodePath(path) {
  return path.split(/[\\/]/).map(encodeURIComponent).join("/");
}

function statePath(root) {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 12);
  return join(tmpdir(), `crocotaste-preview-${hash}.json`);
}

function inside(root, path) {
  return path === root || path.startsWith(root + sep);
}

function inject(html) {
  const at = html.toLowerCase().lastIndexOf("</body>");
  if (at === -1) return html + SNIPPET;
  return html.slice(0, at) + SNIPPET + html.slice(at);
}

function listing(root) {
  const pages = readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".html") &&
        !entry.name.startsWith(".")
    )
    .map((entry) => entry.name)
    .sort();
  const items = pages.length
    ? pages
        .map(
          (name) =>
            `<li><a href="/${encodeURIComponent(name)}">${escapeHtml(name)}</a></li>`
        )
        .join("\n")
    : "<li>No pages here yet.</li>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; margin: 48px auto; max-width: 640px; padding: 0 24px; color: #1a1a1a; background: #fafafa; }
h1 { font-size: 20px; margin: 0 0 16px; }
ul { list-style: none; padding: 0; margin: 0; }
li { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
a { color: inherit; }
@media (prefers-color-scheme: dark) { body { color: #ededed; background: #141414; } li { border-color: #2a2a2a; } }
</style>
</head>
<body>
<h1>Pages in ${escapeHtml(basename(root))}</h1>
<ul>
${items}
</ul>
${SNIPPET}
</body>
</html>
`;
}

// Decodes the request path and maps it into root, or null for anything that
// must look like it does not exist: traversal, dotfiles, .env, bad encoding.
function mapPath(root, url) {
  const raw = url.split(/[?#]/, 1)[0];
  if (!raw.startsWith("/")) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const segments = decoded.split(/[\\/]/).filter(Boolean);
  for (const segment of segments) {
    if (segment.startsWith(".") || segment.toLowerCase() === ".env") {
      return null;
    }
  }
  const path = resolve(root, ...segments);
  return inside(root, path) ? path : null;
}

function probe(port) {
  return new Promise((done) => {
    const req = request(
      {
        host: HOST,
        port,
        path: "/__crocotaste/ping",
        method: "HEAD",
        timeout: PROBE_MS,
      },
      (res) => {
        res.resume();
        done(res.statusCode === 204);
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(false));
    req.end();
  });
}

async function liveServer(root) {
  let state;
  try {
    state = JSON.parse(readFileSync(statePath(root), "utf8"));
  } catch {
    return null;
  }
  if (state?.root !== root || !Number.isInteger(state.port)) return null;
  return (await probe(state.port)) ? state : null;
}

function openBrowser(url) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    // A missing opener is not worth failing over; the URL is printed anyway.
  }
}

function parseArgs(args) {
  const options = { open: false, port: 0, idleMinutes: 60, target: undefined };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--open") {
      options.open = true;
    } else if (arg === "--port" || arg === "--idle-minutes") {
      const value = Number(args[i + 1]);
      i += 1;
      if (arg === "--port") {
        if (!Number.isInteger(value) || value < 0 || value > 65535) return null;
        options.port = value;
      } else {
        if (!Number.isFinite(value) || value <= 0) return null;
        options.idleMinutes = value;
      }
    } else if (arg.startsWith("-") || options.target !== undefined) {
      return null;
    } else {
      options.target = arg;
    }
  }
  return options.target === undefined ? null : options;
}

function startPreview({
  root,
  openPath,
  port = 0,
  idleMinutes = 60,
  open = false,
  io,
}) {
  const realRoot = realpathSync(root);
  const stateFile = statePath(realRoot);
  const client = readFileSync(CLIENT_PATH);
  const clients = new Set();
  const idleMs = idleMinutes * 60_000;
  let idleTimer;
  let debounceTimer;
  let watcher;
  let closing;
  let resolveClosed;
  const closed = new Promise((done) => (resolveClosed = done));

  function touch() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(close, idleMs);
  }

  function send(res, status, headers, body, head) {
    res.writeHead(status, { ...BASE_HEADERS, ...headers });
    res.end(head ? undefined : body);
  }

  function serveFile(res, path, head) {
    let body = readFileSync(path);
    const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
    if (ext === ".html") body = Buffer.from(inject(body.toString("utf8")));
    send(
      res,
      200,
      {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": body.length,
      },
      body,
      head
    );
  }

  function events(req, res) {
    res.writeHead(200, {
      ...BASE_HEADERS,
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });
    if (req.method === "HEAD") return res.end();
    clients.add(res);
    req.on("close", () => clients.delete(res));
    res.write("retry: 1000\n\n: connected\n\n");
  }

  function handle(req, res) {
    touch();
    const head = req.method === "HEAD";
    if (req.method !== "GET" && !head) {
      return send(res, 405, { Allow: "GET, HEAD" }, "");
    }
    const notFound = () =>
      send(
        res,
        404,
        { "Content-Type": "text/plain; charset=utf-8" },
        "Not found\n",
        head
      );
    const pathname = req.url.split(/[?#]/, 1)[0];
    if (pathname === "/__crocotaste/ping") return send(res, 204, {}, "", true);
    if (pathname === "/__crocotaste/events") return events(req, res);
    if (pathname === "/__crocotaste/reload.js") {
      return send(
        res,
        200,
        { "Content-Type": MIME[".js"], "Content-Length": client.length },
        client,
        head
      );
    }
    const path = mapPath(realRoot, req.url);
    if (path === null) return notFound();
    try {
      if (path === realRoot) {
        const index = join(realRoot, "index.html");
        if (existsSync(index)) return serveFile(res, index, head);
        const body = Buffer.from(listing(realRoot));
        return send(
          res,
          200,
          { "Content-Type": MIME[".html"], "Content-Length": body.length },
          body,
          head
        );
      }
      // A symlink inside root must not reach outside it.
      if (!statSync(path).isFile() || !inside(realRoot, realpathSync(path))) {
        return notFound();
      }
      return serveFile(res, path, head);
    } catch {
      return notFound();
    }
  }

  function onChange(_event, filename) {
    if (filename && IGNORED.test(String(filename))) return;
    touch();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      for (const res of clients) res.write("data: reload\n\n");
    }, DEBOUNCE_MS);
  }

  function close() {
    if (closing) return closing;
    clearTimeout(idleTimer);
    clearTimeout(debounceTimer);
    clearInterval(keepAlive);
    watcher?.close();
    for (const res of clients) res.end();
    clients.clear();
    closing = new Promise((done) => {
      server.close(() => done());
      server.closeAllConnections();
    }).then(() => {
      // Only our own state file: a newer preview may have replaced it.
      try {
        const state = JSON.parse(readFileSync(stateFile, "utf8"));
        if (state.pid === process.pid && state.port === actualPort) {
          rmSync(stateFile, { force: true });
        }
      } catch {
        // Already gone.
      }
      resolveClosed();
    });
    return closing;
  }

  const server = createServer(handle);
  const keepAlive = setInterval(() => {
    for (const res of clients) res.write(": keep-alive\n\n");
  }, KEEP_ALIVE_MS);
  let actualPort;

  return new Promise((ready, fail) => {
    server.once("error", (error) => {
      clearInterval(keepAlive);
      fail(error);
    });
    server.listen(port, HOST, () => {
      actualPort = server.address().port;
      try {
        watcher = watch(realRoot, { recursive: true }, onChange);
      } catch {
        // Recursive watching is missing on older Linux; the top folder is
        // still worth watching.
        try {
          watcher = watch(realRoot, onChange);
        } catch {
          io?.stderr.write("Live reload is off: cannot watch this folder.\n");
        }
      }
      watcher?.on("error", () => {});
      const page =
        openPath ??
        (existsSync(join(realRoot, "index.html")) ? "index.html" : "");
      const url = `http://${HOST}:${actualPort}/${encodePath(page)}`;
      writeFileSync(
        stateFile,
        JSON.stringify({
          pid: process.pid,
          port: actualPort,
          url,
          root: realRoot,
        })
      );
      touch();
      if (open) openBrowser(url);
      ready({ url, port: actualPort, close, closed });
    });
  });
}

async function run(args, io) {
  const options = parseArgs(args);
  if (!options) {
    io.stderr.write(`Usage: ${USAGE}`);
    return 2;
  }
  const target = resolve(io.cwd, options.target);
  let stats;
  try {
    stats = statSync(target);
  } catch {
    io.stderr.write(`${options.target}: no such file or folder\n`);
    return 2;
  }
  const root = realpathSync(stats.isDirectory() ? target : dirname(target));
  const openPath = stats.isDirectory()
    ? undefined
    : relative(root, realpathSync(target));

  const live = await liveServer(root);
  if (live) {
    const url = openPath
      ? `http://${HOST}:${live.port}/${encodePath(openPath)}`
      : live.url;
    io.stdout.write(
      `${JSON.stringify({ url, port: live.port, pid: live.pid })}\n`
    );
    io.stderr.write("A preview of this folder is already running.\n");
    return 0;
  }

  let preview;
  try {
    preview = await startPreview({ ...options, root, openPath, io });
  } catch (error) {
    io.stderr.write(`Cannot start the preview: ${error.message}\n`);
    return 1;
  }
  const stop = () => preview.close();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  io.stdout.write(
    `${JSON.stringify({ url: preview.url, port: preview.port, pid: process.pid })}\n`
  );
  io.stderr.write(
    `Serving ${root} read-only. Ctrl-C stops it; it also stops after ${options.idleMinutes} idle minutes.\n`
  );
  await preview.closed;
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
  return 0;
}

export { run, startPreview };
