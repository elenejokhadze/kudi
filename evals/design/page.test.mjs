// Design evals for the design reference page and the colour/icon rules it demonstrates.
// The icon checks need `npm install` (lucide-static); they are skipped without it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const root = new URL("../../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const tpl = read("design/page.template.html");
const page = read("design/index.html");
const lucideDir = new URL("node_modules/lucide-static/icons/", root);
const haveLucide = existsSync(lucideDir);

describe("icons: one pack (Lucide)", () => {
  it("the template draws no SVG of its own except the single Lucide wrapper", () => {
    assert.equal((tpl.match(/<svg/g) ?? []).length, 1);
    assert.equal((tpl.match(/<path|<circle|<rect|<ellipse|<polygon/g) ?? []).length, 0);
  });
  it("every icon in the page is byte-for-byte a Lucide icon", { skip: !haveLucide && "run npm install" }, () => {
    const map = JSON.parse(page.match(/const LUCIDE=(\{.*?\});\n/s)[1]);
    assert.ok(Object.keys(map).length > 0);
    for (const [name, inner] of Object.entries(map)) {
      const file = new URL(`${name}.svg`, lucideDir);
      assert.ok(existsSync(file), `${name} is not a Lucide icon`);
      const svg = readFileSync(file, "utf8");
      const want = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>")).replace(/\s*\n\s*/g, "").trim();
      assert.equal(inner, want, name);
    }
  });
  it("icons use Lucide's default 2px stroke", () => assert.match(tpl, /stroke-width="2"/));
  it("design/index.html is up to date with the template and tokens (run npm run design)", { skip: !haveLucide && "run npm install" }, () => {
    const out = join(mkdtempSync(join(tmpdir(), "kudi-")), "page.html");
    execFileSync(process.execPath, [new URL("scripts/build-design-page.mjs", root).pathname, out]);
    assert.equal(read("design/index.html"), page);
  });
});

describe("accent rules", () => {
  it("one second accent: no orange anywhere", () => {
    assert.doesNotMatch(read("design/tokens.css").replace(/\/\*[\s\S]*?\*\//g, ""), /orange|--color-spark/);
    assert.doesNotMatch(tpl, /orange|--color-spark/);
  });
  it("the green feature card styles never use pink", () => {
    const rules = [...tpl.matchAll(/^([^{}\n]*(\.hl|\.week|\.tip)[^{}\n]*)\{([^}]*)\}/gm)];
    assert.ok(rules.length > 0);
    for (const [, sel, , body] of rules) assert.doesNotMatch(body, /--color-pink|--pink-/, sel);
  });
  it("the feature card markup carries at most one pink detail", () => {
    const card = tpl.match(/<div class="hl">([\s\S]*?)\n      <\/div>\n      <div class="s-list"/)[1];
    const pinkBits = (card.match(/class="(badge|ndot|heart|chip)[" ]/g) ?? []).length;
    assert.ok(pinkBits <= 1, `${pinkBits} pink details`);
  });
  it("the primary button is the only lime-filled button", () => {
    const filled = [...tpl.matchAll(/^\.btn\.([a-z-]+)\{[^}]*background:var\(--color-primary\)/gm)].map((m) => m[1]);
    assert.deepEqual(filled, ["primary"]);
  });
});
