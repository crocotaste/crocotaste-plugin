import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import { createServer, request } from "node:http";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const USAGE =
  "node scripts/crocotaste.mjs serve <file-or-dir> [--open] [--port N] [--idle-minutes N]\n";

const HOST = "127.0.0.1";
const CLIENT_PATH = new URL("../lib/preview-client.js", import.meta.url);
const SNIPPET = '<script src="/__crocotaste/reload.js"></script>';
const DEBOUNCE_MS = 150;
const KEEP_ALIVE_MS = 25_000;
const PROBE_MS = 500;
const MAX_TIMER_MS = 2 ** 31 - 1;
const SECRET_HEADER = "x-crocotaste-preview";
const PARENT_POLL_MS = 10_000;
// The brand book and mockups carry inline style and script, and the
// directions page loads its faces from Google Fonts.
const CSP =
  "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'";

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

// Per user, never the shared tmpdir, so another account cannot plant or read
// it; with no home folder there is no state at all.
function stateDir() {
  try {
    const home = homedir();
    return home ? join(home, ".cache", "crocotaste") : null;
  } catch {
    return null;
  }
}

function statePath(root) {
  const dir = stateDir();
  if (dir === null) return null;
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 12);
  return join(dir, `crocotaste-preview-${hash}.json`);
}

// Only a regular file this user wrote with mode 0600 is trusted; anything else
// could be a plant pointing the preview at someone else's server.
function readState(file) {
  const stats = lstatSync(file);
  if (!stats.isFile()) return null;
  // Windows has no POSIX mode or owner to compare.
  if (
    process.platform !== "win32" &&
    ((stats.mode & 0o777) !== 0o600 || stats.uid !== process.getuid())
  ) {
    return null;
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeState(file, state) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

function hasDotSegment(path) {
  return path.split(/[\\/]/).some((segment) => segment.startsWith("."));
}

function inside(root, path) {
  return path === root || path.startsWith(root + sep);
}

function inject(html) {
  const at = [...html.matchAll(/<\/body\s*>/gi)].at(-1)?.index;
  if (at === undefined) return html + SNIPPET;
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
// must look like it does not exist: traversal, dotfiles, bad encoding.
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
  if (segments.some((segment) => segment.startsWith("."))) return null;
  const path = resolve(root, ...segments);
  return inside(root, path) ? path : null;
}

// Resolves to the preview's secret, or null when nothing like us answers.
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
        done(
          res.statusCode === 204 ? (res.headers[SECRET_HEADER] ?? null) : null
        );
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(null));
    req.end();
  });
}

// A folder preview serves any page directly inside it; a file preview serves
// only its own file.
function covers(state, openPath) {
  if (typeof state.only === "string") return state.only === openPath;
  return (
    openPath === undefined ||
    (!/[\\/]/.test(openPath) && openPath.endsWith(".html"))
  );
}

async function liveServer(root, openPath) {
  const file = statePath(root);
  if (file === null) return null;
  let state;
  try {
    state = readState(file);
  } catch {
    return null;
  }
  if (
    state?.root !== root ||
    !covers(state, openPath) ||
    !Number.isInteger(state.port) ||
    typeof state.secret !== "string" ||
    state.secret.length === 0
  ) {
    return null;
  }
  return (await probe(state.port)) === state.secret ? state : null;
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
      const raw = args[i + 1] ?? "";
      const value = Number(raw);
      i += 1;
      if (arg === "--port") {
        if (!/^\d+$/.test(raw) || value > 65535) return null;
        options.port = value;
      } else {
        if (raw.trim() === "" || !Number.isFinite(value) || value <= 0) {
          return null;
        }
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
  parentPid,
  parentPollMs = PARENT_POLL_MS,
  io,
}) {
  const realRoot = realpathSync.native(root);
  const stateFile = statePath(realRoot);
  // A file target is the whole scope: nothing else in its folder is served.
  const onlyFile =
    openPath === undefined
      ? undefined
      : realpathSync.native(join(realRoot, openPath));
  const secret = randomBytes(16).toString("hex");
  const client = readFileSync(CLIENT_PATH);
  const clients = new Set();
  const idleMs = Math.min(idleMinutes * 60_000, MAX_TIMER_MS);
  let idleTimer;
  let debounceTimer;
  let watcher;
  let closing;
  let parentTimer;
  let stateWritten = false;
  let resolveClosed;
  const closed = new Promise((done) => (resolveClosed = done));

  function touch() {
    if (closing) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(close, idleMs);
  }

  function send(res, status, headers, body, head) {
    res.writeHead(status, { ...BASE_HEADERS, ...headers });
    res.end(head ? undefined : body);
  }

  // Every file goes through here, index included: a symlink must land inside
  // root, on nothing hidden and inside the scope, or it does not exist.
  function realFile(path) {
    const real = realpathSync.native(path);
    if (!inside(realRoot, real) || hasDotSegment(relative(realRoot, real))) {
      return null;
    }
    if (!inScope(path) || !inScope(real)) return null;
    return statSync(real).isFile() ? real : null;
  }

  function inScope(path) {
    if (onlyFile !== undefined) return path === onlyFile;
    const rel = relative(realRoot, path);
    return !rel.includes(sep) && rel.endsWith(".html");
  }

  function serveFile(res, path, head) {
    let body = readFileSync(path);
    const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
    const html = ext === ".html";
    if (html) body = Buffer.from(inject(body.toString("utf8")));
    send(
      res,
      200,
      {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": body.length,
        ...(html ? { "Content-Security-Policy": CSP } : {}),
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
    // A page on another site can point its own name at 127.0.0.1; only our
    // own names may read the files.
    const host = req.headers.host;
    if (
      host !== `${HOST}:${actualPort}` &&
      host !== `localhost:${actualPort}`
    ) {
      return send(
        res,
        403,
        { "Content-Type": "text/plain; charset=utf-8" },
        "Forbidden\n"
      );
    }
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
    if (pathname === "/__crocotaste/ping") {
      return send(res, 204, { "X-Crocotaste-Preview": secret }, "", true);
    }
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
        if (onlyFile !== undefined) return notFound();
        let index;
        try {
          index = realFile(join(realRoot, "index.html"));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          index = undefined;
        }
        if (index === null) return notFound();
        if (index) return serveFile(res, index, head);
        const body = Buffer.from(listing(realRoot));
        return send(
          res,
          200,
          {
            "Content-Type": MIME[".html"],
            "Content-Length": body.length,
            "Content-Security-Policy": CSP,
          },
          body,
          head
        );
      }
      const real = realFile(path);
      return real ? serveFile(res, real, head) : notFound();
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
    clearInterval(parentTimer);
    watcher?.close();
    for (const res of clients) res.end();
    clients.clear();
    closing = new Promise((done) => {
      server.close(() => done());
      server.closeAllConnections();
    }).then(() => {
      // Only our own state file: a newer preview may have replaced it.
      if (stateWritten) {
        try {
          const state = readState(stateFile);
          if (state?.secret === secret) rmSync(stateFile, { force: true });
        } catch {
          // Already gone.
        }
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
      try {
        if (stateFile !== null) {
          writeState(stateFile, {
            pid: process.pid,
            port: actualPort,
            url,
            root: realRoot,
            ...(openPath === undefined ? {} : { only: openPath }),
            secret,
          });
          stateWritten = true;
        }
      } catch {
        // The preview works without it; a second serve just starts another.
        io?.stderr.write(
          "Cannot record this preview; it will not be reused.\n"
        );
      }
      touch();
      // A preview outlives no session: when the process that started it is
      // gone, so is the server.
      if (parentPid !== undefined) {
        // A dead parent's pid can be handed to a new process, but a
        // reparenting shows in ppid; both mean the session is over.
        const ownParent = parentPid === process.ppid;
        parentTimer = setInterval(() => {
          if (ownParent && process.ppid !== parentPid) return close();
          try {
            process.kill(parentPid, 0);
          } catch (error) {
            if (error.code !== "EPERM") close();
          }
        }, parentPollMs);
        parentTimer.unref();
      }
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
  const root = realpathSync.native(
    stats.isDirectory() ? target : dirname(target)
  );
  const openPath = stats.isDirectory()
    ? undefined
    : relative(root, realpathSync.native(target));

  const live = await liveServer(root, openPath);
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
    preview = await startPreview({
      ...options,
      root,
      openPath,
      parentPid: process.ppid,
      io,
    });
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

export { run, startPreview, statePath };
