// Design evals for design/tokens.css: run with `npm test` (no install needed, uses node:test).
// They fail when a token change breaks contrast, the type scale, the spacing grid or the colour rules.
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const css = readFileSync(new URL("../../design/tokens.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// ---------- parse the light (:root) and dark (:root[data-theme="dark"]) blocks ----------
const block = (re) => {
  const m = css.match(re);
  assert.ok(m, `missing block ${re}`);
  return Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
};
const light = block(/^:root\{([\s\S]*?)\n\}/m);
const dark = { ...light, ...block(/:root\[data-theme="dark"\]\{([\s\S]*?)\n\}/) };
const media = block(/:root:not\(\[data-theme="light"\]\)\{([\s\S]*?)\n  \}/);
const resolve = (t, v, seen = 0) => (seen > 10 ? v : v.replace(/var\(--([a-z0-9-]+)\)/g, (_, k) => resolve(t, t[k] ?? "", seen + 1)));
const val = (t, k) => resolve(t, t[k] ?? assert.fail(`missing token --${k}`));

// ---------- WCAG contrast, with rgba blended over its background ----------
const parse = (c) => {
  if (c.startsWith("#")) { const h = c.slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1); }
  const m = c.match(/rgba?\(([^)]+)\)/); assert.ok(m, `not a colour: ${c}`);
  const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p[3] ?? 1];
};
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
const lum = (rgb) => { const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (t, fg, bg) => {
  const b = parse(val(t, bg)); const f = over(parse(val(t, fg)), b);
  const [x, y] = [lum(f), lum(b.slice(0, 3))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const CATS = ["feed", "meds", "vax", "heat", "weight", "trip"];
const TEXT_PAIRS = [
  ["color-ink", "color-bg"], ["color-ink", "color-surface-2"], ["color-ink-2", "color-bg"], ["color-ink-2", "color-surface-2"],
  ["color-on-primary", "color-primary"], ["color-on-primary", "color-primary-pressed"], ["color-on-tooltip", "color-tooltip"],
  ["color-brand", "color-bg"], ["color-on-pink", "color-pink"], ["color-ink", "color-pink-soft"],
  ["color-on-feature", "color-feature"], ["color-feature-title", "color-feature"], ["color-feature-ink-2", "color-feature"],
  ["color-on-spark", "color-spark"],
  ["color-success", "color-success-bg"], ["color-warning", "color-warning-bg"], ["color-danger", "color-danger-bg"], ["color-info", "color-info-bg"],
  ...CATS.map((c) => [`cat-${c}-ink`, `cat-${c}-bg`]),
];
const UI_PAIRS = [
  ["color-pink-strong", "color-bg"],   // hearts and notification dots carry meaning
  ["color-primary", "color-feature"],  // lime bars and progress on the green card
  ["color-pink", "color-feature"],     // pink tooltip and rings on the green card
  ["color-focus", "color-bg"],
];

for (const [name, t] of [["light", light], ["dark", dark]]) {
  describe(`${name} theme`, () => {
    for (const [fg, bg] of TEXT_PAIRS) it(`text ${fg} on ${bg} meets AA 4.5:1`, () => {
      const r = contrast(t, fg, bg); assert.ok(r >= 4.5, `${r.toFixed(2)}:1`);
    });
    for (const [fg, bg] of UI_PAIRS) it(`UI ${fg} on ${bg} meets 3:1`, () => {
      const r = contrast(t, fg, bg); assert.ok(r >= 3, `${r.toFixed(2)}:1`);
    });
  });
}

describe("theme blocks", () => {
  it("the media-query dark block and the [data-theme=dark] block define the same values", () => {
    const d = block(/:root\[data-theme="dark"\]\{([\s\S]*?)\n\}/);
    assert.deepEqual(media, d);
  });
  it("every token redefined for dark also exists on bare :root", () => {
    assert.deepEqual(Object.keys(media).filter((k) => !(k in light)), []);
  });
});

describe("colour rules", () => {
  it("exactly one primary-action colour, in lime", () => {
    assert.match(light["color-primary"], /lime/);
    assert.equal(Object.keys(light).filter((k) => /^color-(primary|cta|accent)$/.test(k)).length, 1);
  });
  it("app background stays neutral white", () => assert.equal(val(light, "color-bg").toUpperCase(), "#FFFFFF"));
  it("the brand palette is forest, pink, lime, cream with orange and yellow sparks", () => {
    const families = new Set(Object.keys(light).filter((k) => /^[a-z]+-\d+$/.test(k) && !/^(space|shadow)-/.test(k)).map((k) => k.split("-")[0]));
    assert.deepEqual([...families].sort(), ["cream", "forest", "grey", "lime", "orange", "pink", "red", "yellow"]);
  });
});

describe("typography", () => {
  it("one family: Figtree", () => assert.match(light["font-sans"], /^'Figtree'/));
  it("weights stay within 400-700", () => {
    for (const [k, v] of Object.entries(light)) if (k.startsWith("weight-")) assert.ok(+v >= 400 && +v <= 700, k);
  });
  it("body is at least 15px and text sizes sit on a 1px scale with 4px-rhythm line heights", () => {
    assert.ok(parseInt(light["text-body"]) >= 15);
    for (const [k, v] of Object.entries(light)) if (k.startsWith("leading-")) assert.equal(parseInt(v) % 2, 0, `${k} ${v}`);
  });
  it("only the display size is above 28px", () => {
    const big = Object.entries(light).filter(([k, v]) => k.startsWith("text-") && parseInt(v) > 28).map(([k]) => k);
    assert.deepEqual(big, ["text-display"]);
  });
});

describe("spacing, radius, layout", () => {
  it("spacing is on the 4px grid (except the 2px hairline step)", () => {
    for (const [k, v] of Object.entries(light)) if (k.startsWith("space-") && k !== "space-px" && v !== "0") assert.equal(parseInt(v) % 4, 0, `${k} ${v}`);
  });
  it("radius set is fixed", () => {
    assert.deepEqual(Object.keys(light).filter((k) => k.startsWith("radius-")), ["radius-xs", "radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-pill", "radius-round"]);
  });
  it("touch targets are at least 48px and the gutter is 16px", () => {
    assert.ok(parseInt(light["tap-min"]) >= 48);
    assert.equal(light["layout-gutter"], "16px");
  });
});
