import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readTokenBlock,
  parseTokens,
  parseColor,
  TokenBlockError,
  REQUIRED_TOKENS,
} from "../lib/css-tokens.mjs";

const fixture = readFileSync(
  new URL("./fixtures/brand-min.html", import.meta.url),
  "utf8"
);

test("readTokenBlock returns the css between the markers", () => {
  const { css, start, end } = readTokenBlock(fixture);
  assert.ok(css.includes(":root"));
  assert.ok(css.includes('[data-theme="dark"]'));
  assert.ok(start < end);
});

test("markers inside a css comment leave the comment out of the block", () => {
  const html =
    "<style>\n/* <!-- tokens:start --> */\n:root { --a: 1; }\n/* <!-- tokens:end --> */\n</style>";
  const { css, start, end } = readTokenBlock(html);
  assert.equal(css, "\n:root { --a: 1; }\n");
  assert.equal(html.slice(start, end), css);
  assert.equal(parseTokens(css).light.get("a"), "1");
});

test("a bare start and a wrapped end leave no half comment in the block", () => {
  const html =
    "<style>\n<!-- tokens:start -->\n:root { --a: 1; }\n/* <!-- tokens:end --> */\n</style>";
  const { css } = readTokenBlock(html);
  assert.equal(css, "\n:root { --a: 1; }\n");
  const reversed =
    "<style>\n/* <!-- tokens:start --> */\n:root { --a: 1; }\n<!-- tokens:end -->\n</style>";
  assert.equal(readTokenBlock(reversed).css, "\n:root { --a: 1; }\n");
});

test("readTokenBlock throws naming a missing marker", () => {
  const html = fixture.replace("<!-- tokens:end -->", "");
  assert.throws(
    () => readTokenBlock(html),
    (error) =>
      error instanceof TokenBlockError && error.message.includes("tokens:end")
  );
});

test("parseTokens reads light and dark sets", () => {
  const { light, dark } = parseTokens(readTokenBlock(fixture).css);
  assert.equal(light.get("color-canvas"), "#ffffff");
  assert.equal(dark.get("color-canvas"), "#0b0d10");
});

test("the fixture defines every required token", () => {
  const { light } = parseTokens(readTokenBlock(fixture).css);
  assert.deepEqual(
    REQUIRED_TOKENS.filter((name) => !light.has(name)),
    []
  );
});

test("parseTokens resolves var() references", () => {
  const { light } = parseTokens(readTokenBlock(fixture).css);
  assert.equal(light.get("color-focus"), light.get("color-primary"));
});

test("parseTokens resolves a dark var() against the dark set first", () => {
  const { dark } = parseTokens(readTokenBlock(fixture).css);
  assert.equal(dark.get("color-focus"), dark.get("color-primary"));
});

test("parseTokens strips comments and keeps rgba", () => {
  const { light } = parseTokens(
    ":root { /* note */ --color-scrim: rgba(0,0,0,0.5); }"
  );
  assert.equal(light.get("color-scrim"), "rgba(0,0,0,0.5)");
});

test("parseTokens accepts single quotes on the dark selector", () => {
  const { dark } = parseTokens("[data-theme='dark'] { --a: #000; }");
  assert.equal(dark.get("a"), "#000");
});

test("parseTokens leaves an unresolved var as the raw string", () => {
  const { light } = parseTokens(":root { --a: var(--nope); }");
  assert.equal(light.get("a"), "var(--nope)");
});

test("parseTokens does not loop on a cycle", () => {
  const { light } = parseTokens(":root { --a: var(--b); --b: var(--a); }");
  assert.equal(light.get("a"), "var(--b)");
});

test("parseTokens resolves a nested var() fallback", () => {
  const { light } = parseTokens(
    ":root { --b: #123456; --a: var(--missing, var(--b)); --c: var(--nope, #fff); --d: var(--nope, var(--gone)); }"
  );
  assert.equal(light.get("a"), "#123456");
  assert.equal(light.get("c"), "#fff");
  assert.equal(light.get("d"), "var(--nope, var(--gone))");
});

test("parseColor handles hex, rgb, rgba, hsl and rejects names", () => {
  assert.deepEqual(parseColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor("#2456e6"), { r: 36, g: 86, b: 230, a: 1 });
  assert.equal(parseColor("#ff000080").a, 128 / 255);
  assert.equal(parseColor("rgba(0,0,0,.5)").a, 0.5);
  assert.deepEqual(parseColor("rgb(10, 20, 30)"), {
    r: 10,
    g: 20,
    b: 30,
    a: 1,
  });
  const modern = parseColor("hsl(120 50% 50%)");
  assert.ok(modern.g > modern.r);
  assert.deepEqual(parseColor("hsl(120, 50%, 50%)"), modern);
  assert.equal(parseColor("hsla(0, 100%, 50%, 0.25)").a, 0.25);
  assert.equal(parseColor("red"), null);
  assert.equal(parseColor("var(--x)"), null);
});
