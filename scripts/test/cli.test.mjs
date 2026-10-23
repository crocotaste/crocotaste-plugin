import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "../lib/cli.mjs";

function capture() {
  const out = [];
  const err = [];
  return {
    io: {
      stdout: { write: (text) => out.push(text) },
      stderr: { write: (text) => err.push(text) },
      cwd: process.cwd(),
    },
    out: () => out.join(""),
    err: () => err.join(""),
  };
}

test("help lists the five commands and returns 0", async () => {
  const { io, out } = capture();
  assert.equal(await run(["help"], io), 0);
  for (const name of ["check", "tokens", "sync", "serve", "fonts"]) {
    assert.ok(out().includes(name), name);
  }
});

test("no arguments prints help and returns 0", async () => {
  const { io, out } = capture();
  assert.equal(await run([], io), 0);
  assert.ok(out().includes("tokens"));
});

test("an unknown command returns 2 and prints help", async () => {
  const { io, out, err } = capture();
  assert.equal(await run(["nope"], io), 2);
  assert.ok(err().includes("nope"));
  assert.ok(out().includes("check"));
});
