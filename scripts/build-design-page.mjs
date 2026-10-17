// Builds design/index.html from design/page.template.html, design/tokens.css and the Lucide icons
// the page names in its ALIAS map. Run: npm run design   (needs `npm install` for lucide-static)
// Optional: node scripts/build-design-page.mjs <out.html> also writes a copy without the document
// skeleton, for publishing as a hosted page.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const tpl = read("design/page.template.html");
const css = read("design/tokens.css");
const iconDir = new URL("icons/", new URL(".", "file://" + createRequire(import.meta.url).resolve("lucide-static/package.json")));

const alias = tpl.match(/const ALIAS=\{(.*?)\};/s)[1];
const names = [...new Set([...alias.matchAll(/:'([a-z0-9-]+)'/g)].map((m) => m[1]))];
const lucide = Object.fromEntries(names.map((n) => {
  const svg = readFileSync(new URL(`${n}.svg`, iconDir), "utf8");
  return [n, svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>")).replace(/\s*\n\s*/g, "").trim()];
}));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const body = tpl.replace("/*TOKENS*/", () => css).replace("/*SRC*/", () => esc(css)).replace("/*LUCIDE*/", () => JSON.stringify(lucide));
writeFileSync(new URL("design/index.html", root),
  `<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${body}`);
if (process.argv[2]) writeFileSync(process.argv[2], body);
console.log(`design/index.html built with ${names.length} Lucide icons`);
