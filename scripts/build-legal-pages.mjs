// Builds public/privacy.html and public/terms.html from the LEGAL text inside public/index.html,
// so the App Store links and the in-app pages always say the same thing. Run: npm run legal
import { readFileSync, writeFileSync } from "node:fs";

const app = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const tokens = app.slice(app.indexOf("/* tokens:start"), app.indexOf("/* tokens:end */") + "/* tokens:end */".length);
const src = app.slice(app.indexOf("const LEGAL = {"), app.indexOf("function legalPage("));
// public pages describe the app as installed: records on the phone until family sharing exists
const LEGAL = new Function("syncMode", "MVP", `${src}; return LEGAL;`)("device", true);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

for (const [kind, file] of [["privacy", "privacy.html"], ["terms", "terms.html"]]) {
  const L = LEGAL[kind];
  const body = L.sections().map(([h, t], i) => `<h2>${i + 1}. ${esc(h)}</h2>\n<p>${esc(t)}</p>`).join("\n");
  writeFileSync(new URL(`../public/${file}`, import.meta.url), `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kudi ${esc(L.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&display=swap">
<style>
${tokens}
body{margin:0;background:var(--color-bg);color:var(--color-ink);font:var(--type-body)}
main{max-width:var(--layout-max);margin:0 auto;padding:var(--space-8) var(--layout-gutter) var(--space-16)}
h1{font:var(--type-h1);margin:0 0 var(--space-2)}
h2{font:var(--type-title);margin:var(--space-6) 0 var(--space-2)}
p{color:var(--color-ink-2);margin:0}
</style></head>
<body><main><h1>${esc(L.title)}</h1><p>Last updated 17 Oct 2026</p>
${body}
</main></body></html>
`);
  console.log(`wrote public/${file}`);
}
