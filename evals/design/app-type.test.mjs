// Measured eval: every font size and weight in the app (CSS and inline styles in the app's JavaScript)
// sits on the token type scale. Run: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
// sizes on the scale: display 56, h1 28, h2 22, h3 18, title 16, body 15, label 13, caption 12, micro 11
const SCALE = new Set([56, 28, 22, 18, 16, 15, 13, 12, 11]);
const lineOf = (i) => app.slice(0, i).split("\n").length;

describe("typography in the app follows the type scale", () => {
  it("no font size off the scale", () => {
    const bad = [...app.matchAll(/font-size:\s*(\d+)px/g)].filter((m) => !SCALE.has(+m[1])).map((m) => `${m[1]}px (line ${lineOf(m.index)})`);
    assert.deepEqual(bad, [], `off-scale sizes: ${bad.join(", ")}`);
  });
  it("no weight above 700 (Figtree 400-700)", () => {
    const bad = [...app.matchAll(/font-weight:\s*(\d+)/g)].filter((m) => +m[1] > 700).map((m) => `${m[1]} (line ${lineOf(m.index)})`);
    assert.deepEqual(bad, [], `too heavy: ${bad.join(", ")}`);
  });
});
