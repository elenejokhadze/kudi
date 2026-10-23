// Measured eval: outside the token block, the app uses design tokens only.
// Colours come from tokens (masks may use #000 and #fff, which mean hidden and shown to the browser, not colours),
// and spacing, type sizes and weights in styles come from the token scales. Run: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
const start = app.indexOf("/* tokens:end */");
const body = app.slice(start);
const line = (i) => app.slice(0, start + i).split("\n").length;
const css = body.slice(0, body.indexOf("</style>"));

describe("the app uses design tokens only", () => {
  it("no raw colours outside the token block (mask black and white excepted)", () => {
    const inMask = (i) => { const before = body.slice(Math.max(0, i - 400), i); return before.lastIndexOf("<mask") > before.lastIndexOf("</mask>"); };
    const bad = [...body.matchAll(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g)].filter((m) => !((m[0] === "#000" || m[0] === "#fff") && (inMask(m.index) || /cut|holes|mask/i.test(body.slice(Math.max(0, m.index - 200), m.index))))).map((m) => `${m[0]} (line ${line(m.index)})`);
    assert.deepEqual(bad, [], bad.join(", "));
  });
  it("no raw spacing in stylesheet margins, paddings and gaps", () => {
    const bad = [...css.matchAll(/(?:^|[{;])\s*((?:margin|padding|gap)[a-z-]*)\s*:\s*([^;}]+)/g)]
      .filter((m) => !m[2].includes("calc") && /(?<![\w.-])[1-9]\d*px/.test(m[2])).map((m) => `${m[1]}:${m[2]} (line ${line(m.index)})`);
    assert.deepEqual(bad, [], bad.join(", "));
  });
  it("inline styles use spacing, type and weight tokens", () => {
    const bad = [...body.matchAll(/style="([^"]*)"/g)].flatMap((m) => m[1].split(";").filter((d) =>
      (/^\s*(margin|padding|gap)/.test(d) && !d.includes("calc") && /(?<![\w.-])[1-9]\d*px/.test(d)) ||
      /^\s*font-size\s*:\s*\d+px/.test(d) || /^\s*font-weight\s*:\s*\d+/.test(d)).map((d) => `${d.trim()} (line ${line(m.index)})`));
    assert.deepEqual(bad, [], bad.join(", "));
  });
});
