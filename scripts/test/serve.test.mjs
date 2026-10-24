import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/cli.mjs";
import { startPreview, statePath } from "../commands/serve.mjs";

const quiet = { stdout: { write() {} }, stderr: { write() {} } };

function setup() {
  const root = mkdtempSync(join(tmpdir(), "serve-"));
  const site = join(root, "site");
  mkdirSync(site);
  writeFileSync(
    join(site, "index.html"),
    "<!doctype html><html><body><h1>Hi</h1></body></html>"
  );
  return { root, site };
}

async function get(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// fetch normalizes "../" away and fixes Host, so those go out on a raw socket.
function rawGet(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port, path, method: "GET", headers, timeout: 2000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

test("serves index.html with the reload snippet injected before </body>", async () => {
  const { site } = setup();
  const preview = await startPreview({ root: site, io: quiet });
  try {
    assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/index\.html$/);
    const response = await get(preview.url);
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "text/html; charset=utf-8"
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(
      response.headers.get("cross-origin-resource-policy"),
      "same-origin"
    );
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const body = await response.text();
    assert.ok(
      body.includes(
        '<h1>Hi</h1><script src="/__crocotaste/reload.js"></script></body>'
      ),
      body
    );
    const client = await get(
      new URL("/__crocotaste/reload.js", preview.url).href
    );
    assert.equal(client.status, 200);
    assert.ok((await client.text()).includes("EventSource"));
  } finally {
    await preview.close();
  }
});

test("answers 204 on ping and 405 on POST", async () => {
  const { site } = setup();
  const preview = await startPreview({ root: site, io: quiet });
  try {
    const ping = await get(new URL("/__crocotaste/ping", preview.url).href, {
      method: "HEAD",
    });
    assert.equal(ping.status, 204);
    const post = await get(preview.url, { method: "POST", body: "x" });
    assert.equal(post.status, 405);
  } finally {
    await preview.close();
  }
});

test("refuses ../, dotfiles and .env with 404 and never reads them", async () => {
  const { root, site } = setup();
  writeFileSync(join(root, "secret.txt"), "secret");
  writeFileSync(join(site, ".env"), "TOKEN=x");
  mkdirSync(join(site, ".hidden"));
  writeFileSync(join(site, ".hidden", "x"), "hidden");
  mkdirSync(join(site, "sub"));
  writeFileSync(join(site, "sub", ".env"), "TOKEN=y");
  const preview = await startPreview({ root: site, io: quiet });
  try {
    for (const path of [
      "/../secret.txt",
      "/..%2fsecret.txt",
      "/sub/..%2f..%2fsecret.txt",
      "/.env",
      "/%2eenv",
      "/sub/.env",
      "/.hidden/x",
      "/sub",
      "/%00",
    ]) {
      assert.equal((await rawGet(preview.port, path)).status, 404, path);
    }
  } finally {
    await preview.close();
  }
});

test("refuses a request whose Host is not ours with 403", async () => {
  const { site } = setup();
  const preview = await startPreview({ root: site, io: quiet });
  try {
    for (const path of ["/index.html", "/__crocotaste/ping"]) {
      const { status, body } = await rawGet(preview.port, path, {
        Host: `evil.example:${preview.port}`,
      });
      assert.equal(status, 403, path);
      assert.ok(!body.includes("Hi"));
    }
    const local = await rawGet(preview.port, "/index.html", {
      Host: `localhost:${preview.port}`,
    });
    assert.equal(local.status, 200);
  } finally {
    await preview.close();
  }
});

test("a symlink that leaves root or lands on a dotfile is a 404", async () => {
  const outside = mkdtempSync(join(tmpdir(), "serve-out-"));
  writeFileSync(join(outside, "secret.html"), "<p>secret</p>");
  const root = mkdtempSync(join(tmpdir(), "serve-"));
  writeFileSync(join(root, ".env"), "TOKEN=x");
  symlinkSync(join(outside, "secret.html"), join(root, "index.html"));
  symlinkSync(".env", join(root, "config.html"));
  const preview = await startPreview({ root, io: quiet });
  try {
    for (const path of ["/", "/index.html", "/config.html"]) {
      const { status, body } = await rawGet(preview.port, path);
      assert.equal(status, 404, path);
      assert.ok(!body.includes("secret") && !body.includes("TOKEN"), path);
    }
  } finally {
    await preview.close();
  }
});

test(
  "the state file is private to the user",
  {
    skip: process.platform === "win32",
  },
  async () => {
    const { site } = setup();
    const preview = await startPreview({ root: site, io: quiet });
    try {
      const file = statePath(realpathSync.native(site));
      assert.equal(statSync(file).mode & 0o777, 0o600);
    } finally {
      await preview.close();
    }
    assert.ok(!existsSync(statePath(realpathSync.native(site))));
  }
);

test("a state file with the wrong secret is not reused", async () => {
  const { site } = setup();
  const decoy = setup();
  const other = await startPreview({ root: decoy.site, io: quiet });
  try {
    const root = realpathSync.native(site);
    mkdirSync(join(statePath(root), ".."), { recursive: true });
    writeFileSync(
      statePath(root),
      JSON.stringify({
        pid: 1,
        port: other.port,
        url: other.url,
        root,
        secret: "0".repeat(32),
      })
    );
    let out = "";
    const code = await run(["serve", site, "--idle-minutes", "0.01"], {
      stdout: { write: (text) => (out += text) },
      stderr: { write() {} },
      cwd: site,
    });
    assert.equal(code, 0);
    const line = JSON.parse(out.trim());
    assert.notEqual(line.port, other.port);
    assert.equal(line.pid, process.pid);
  } finally {
    await other.close();
  }
});

test("lists the html files when there is no index.html", async () => {
  const root = mkdtempSync(join(tmpdir(), "serve-"));
  writeFileSync(join(root, "a b.html"), "<p>a</p>");
  writeFileSync(join(root, "notes.txt"), "n");
  const preview = await startPreview({ root, io: quiet });
  try {
    assert.match(preview.url, /\/$/);
    const body = await (await get(preview.url)).text();
    assert.ok(body.includes('href="/a%20b.html"'), body);
    assert.ok(!body.includes("notes.txt"));
    assert.ok(body.includes("/__crocotaste/reload.js"));
  } finally {
    await preview.close();
  }
});

test("broadcasts reload on a file change", async () => {
  const { site } = setup();
  const preview = await startPreview({ root: site, io: quiet });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(
      new URL("/__crocotaste/events", preview.url).href,
      { signal: controller.signal }
    );
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let seen = "";
    let wrote = false;
    while (!seen.includes("data: reload")) {
      const { value, done } = await reader.read();
      if (done) break;
      seen += decoder.decode(value, { stream: true });
      if (!wrote && seen.includes(": connected")) {
        wrote = true;
        writeFileSync(join(site, "index.html"), "<body>changed</body>");
      }
    }
    assert.ok(seen.includes("retry: 1000"), seen);
    assert.ok(seen.includes("data: reload"), seen);
    controller.abort();
  } finally {
    clearTimeout(timer);
    await preview.close();
  }
});

test("a second start on the same root reuses the live server", async () => {
  const { site } = setup();
  const preview = await startPreview({ root: site, io: quiet });
  try {
    let out = "";
    const code = await run(["serve", join(site, "index.html")], {
      stdout: { write: (text) => (out += text) },
      stderr: { write() {} },
      cwd: site,
    });
    assert.equal(code, 0);
    const line = JSON.parse(out.trim());
    assert.equal(line.url, preview.url);
    assert.equal(line.port, preview.port);
  } finally {
    await preview.close();
  }
});

test("a missing path or a bad flag is a usage error", async () => {
  const { site } = setup();
  const io = { ...quiet, cwd: site };
  assert.equal(await run(["serve"], io), 2);
  assert.equal(await run(["serve", "nope.html"], io), 2);
  assert.equal(await run(["serve", ".", "--port", "x"], io), 2);
  assert.equal(await run(["serve", ".", "--wat"], io), 2);
  assert.equal(await run(["serve", ".", "--port", ""], io), 2);
  assert.equal(await run(["serve", ".", "--idle-minutes", ""], io), 2);
});

test("closes after the idle timeout", async () => {
  const { site } = setup();
  const preview = await startPreview({
    root: site,
    idleMinutes: 0.01,
    io: quiet,
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await assert.rejects(
    get(new URL("/__crocotaste/ping", preview.url).href, { method: "HEAD" })
  );
  await preview.close();
});

test("a file target serves only that file", async () => {
  const { site } = setup();
  writeFileSync(join(site, "BRAND.html"), "<body>brand</body>");
  writeFileSync(join(site, "creds.json"), '{"token":"x"}');
  const preview = await startPreview({
    root: site,
    openPath: "BRAND.html",
    io: quiet,
  });
  try {
    assert.match(preview.url, /\/BRAND\.html$/);
    const page = await get(preview.url);
    assert.equal(page.status, 200);
    assert.equal(
      page.headers.get("content-security-policy").split(";")[0],
      "default-src 'self'"
    );
    for (const path of ["/creds.json", "/index.html", "/"]) {
      const { status, body } = await rawGet(preview.port, path);
      assert.equal(status, 404, path);
      assert.ok(!body.includes("token"), path);
    }
    assert.equal(
      (await rawGet(preview.port, "/__crocotaste/reload.js")).status,
      200
    );
  } finally {
    await preview.close();
  }
});

test("a directory target serves html files only", async () => {
  const { site } = setup();
  writeFileSync(join(site, "notes.txt"), "private notes");
  writeFileSync(join(site, "home.html"), "<body>home</body>");
  mkdirSync(join(site, "deep"));
  writeFileSync(join(site, "deep", "page.html"), "<body>deep</body>");
  symlinkSync("notes.txt", join(site, "alias.html"));
  const preview = await startPreview({ root: site, io: quiet });
  try {
    const home = await get(new URL("/home.html", preview.url).href);
    assert.equal(home.status, 200);
    assert.ok(
      home.headers
        .get("content-security-policy")
        .includes("font-src 'self' data: https://fonts.gstatic.com")
    );
    for (const path of ["/notes.txt", "/deep/page.html", "/alias.html"]) {
      const { status, body } = await rawGet(preview.port, path);
      assert.equal(status, 404, path);
      assert.ok(!body.includes("private"), path);
    }
  } finally {
    await preview.close();
  }
});

test(
  "a state file that is not 0600 is refused",
  { skip: process.platform === "win32" },
  async () => {
    const { site } = setup();
    const decoy = setup();
    const other = await startPreview({ root: decoy.site, io: quiet });
    try {
      const root = realpathSync.native(site);
      const state = JSON.parse(
        readFileSync(statePath(realpathSync.native(decoy.site)), "utf8")
      );
      const file = statePath(root);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, JSON.stringify({ ...state, root }));
      chmodSync(file, 0o644);
      let out = "";
      const io = {
        stdout: { write: (text) => (out += text) },
        stderr: { write() {} },
        cwd: site,
      };
      assert.equal(await run(["serve", site, "--idle-minutes", "0.01"], io), 0);
      assert.notEqual(JSON.parse(out.trim()).port, other.port);
      // The same file at 0600 is trusted, so the check is the mode alone.
      writeFileSync(file, JSON.stringify({ ...state, root }));
      chmodSync(file, 0o600);
      out = "";
      assert.equal(await run(["serve", site], io), 0);
      assert.equal(JSON.parse(out.trim()).port, other.port);
    } finally {
      await other.close();
    }
  }
);

test("closes when the parent process is gone", async () => {
  const { site } = setup();
  const parent = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"]);
  await new Promise((resolve) => parent.once("spawn", resolve));
  const preview = await startPreview({
    root: site,
    parentPid: parent.pid,
    parentPollMs: 50,
    io: quiet,
  });
  parent.kill();
  await new Promise((resolve) => parent.once("exit", resolve));
  const result = await Promise.race([
    preview.closed.then(() => "closed"),
    new Promise((resolve) => setTimeout(() => resolve("open"), 2000)),
  ]);
  if (result === "open") await preview.close();
  assert.equal(result, "closed");
});
