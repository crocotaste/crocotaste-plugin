import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../lib/contrast.mjs";

const black = { r: 0, g: 0, b: 0, a: 1 };
const white = { r: 255, g: 255, b: 255, a: 1 };

test("black on white is 21:1 and white on white is 1:1", () => {
  assert.ok(Math.abs(contrastRatio(black, white) - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio(white, white) - 1) < 0.001);
});

test("alpha is composited over the background first", () => {
  const half = { r: 0, g: 0, b: 0, a: 0.5 };
  assert.ok(Math.abs(contrastRatio(half, white) - 3.95) < 0.05);
});
