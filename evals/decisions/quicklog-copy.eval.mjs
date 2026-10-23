// Decision eval: the two caption lines under each Quick log tile (Treat, Walk, Water) on Today.
// Run: node evals/decisions/quicklog-copy.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-quicklog-copy.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a family pet-care app. Today has a Quick log row with three square tiles (about 110 px wide): Treat, Walk, Water. Tapping a tile logs one event.",
  "Under the tile name there is room for one or two short caption lines. Families use it to see whether the dog was already walked or given treats, and by whom, so nobody doubles up.",
  "The owner found '2 · You 22:40' confusing and then 'Last you, 22:56' weird.",
];
const DECISIONS = [{
  id: "caption", question: "Which captions should a logged tile show?",
  options: {
    count_relative: "Line 1: '3 today'. Line 2: 'You, 5 min ago' or 'Giorgi, 2 h ago'.",
    count_clock: "Line 1: '3 today'. Line 2: 'You · 22:56'.",
    single: "One line only: '3 today'.",
    last_only: "One line only: 'Giorgi at 08:40'.",
  },
  checks: { clear: "Is it immediately clear what the numbers and names mean?", fits: "Does it fit a 110 px tile without truncation?" },
}];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient(); const lines = ["Decision eval: quick log captions"]; let split = 0;
for (const d of DECISIONS) {
  const keys = Object.keys(d.options);
  const ask = (order) => client.systemOne({ state: { context }, questions: {
    pick: choice(`Based on \`context\`, ${d.question}`, Object.fromEntries(order.map((k) => [k, d.options[k]]))),
    ...Object.fromEntries(Object.entries(d.checks).map(([k, q]) => [k, noul(`Based on \`context\`, ${q}`)])) } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask));
  const picks = runs.map((r) => r.answers.pick.choice); if (picks[0] !== picks[1]) split++;
  runs.forEach((r, i) => lines.push(`${d.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})` + Object.keys(d.checks).map((k) => `, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${d.id}: ${picks[0] === picks[1] ? `agreed on ${picks[0]}` : "SPLIT between orders, ask the owner"}`);
}
mkdirSync("evals/results", { recursive: true }); writeFileSync("evals/results/decision-quicklog-copy.txt", lines.join("\n") + "\n");
console.log(lines.join("\n")); process.exit(split ? 1 : 0);
