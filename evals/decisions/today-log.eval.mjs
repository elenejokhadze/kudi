// Decision eval: the lower half of Today (schedule, quick log, the family's extra logs) and the quick-log icons.
// Options are asked in two orders to catch position bias.
// Run: node evals/decisions/today-log.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-today-log.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app shared by a family. Several people use it every day to see who fed the pet and when, so nobody feeds twice.",
  "Today screen now, top to bottom: the pet with 'x of y done', an 'Up next' card, a 'Today' list of the day's meals and medicine doses in time order (time, icon tile, name, who did it, Undo), a 'Quick log' grid of four tiles (Treat, Walk, Water, Weight), then an 'Also today' list with one row per extra log ('You went for a walk 20:34', 'You gave a treat 20:34', with an x to delete).",
  "The owner says everything looks the same: the 'Today' rows and the 'Also today' rows use the identical row style, and the names 'Today' and 'Also today' are confusing.",
  "Treat, Walk and Water are one-tap logs. Weight opens a sheet to type kilograms; weight also has its own section in Health with a trend chart.",
  "The owner asked whether quick log should be just three, and wants more illustrative icons aligned with the welcome screen (hand-painted watercolour dogs), just the icon without a coloured tile behind it, and something more innovative.",
  "Today the icons are 1.5 px line icons (Iconoir) inside small tinted tiles. No watercolour artwork for treat, walk or water exists yet; it would have to be painted or generated first.",
  "Logging already shows a toast; deleting an extra log needs a way back (undo).",
];

const DECISIONS = [
  {
    id: "extra_logs",
    question: "Where should treats, walks and water logged today show up?",
    options: {
      on_buttons: "On the quick-log buttons themselves: each shows today's count and who did it last ('Walk · 2 · Giorgi 08:40'); tap logs one more, the toast offers Undo. Remove the separate 'Also today' list.",
      one_timeline: "Merge everything into the single 'Today' list in time order, extras mixed with meals and medicine.",
      renamed_list: "Keep a separate list below quick log, renamed 'Family log', in the same row style.",
    },
    checks: { removes_duplicate: "Does this remove the confusing second list that looks the same?", keeps_who: "Can the family still see who did it?" },
  },
  {
    id: "weight",
    question: "Should Weight stay in quick log?",
    options: {
      three: "No: quick log is Treat, Walk, Water; weight stays in Health, where the trend chart is.",
      four: "Yes: keep Weight as a fourth quick-log tile (as now).",
    },
    checks: { one_tap: "Are all remaining quick-log items true one-tap logs?" },
  },
  {
    id: "icons",
    question: "Which icon treatment should the quick-log buttons use now?",
    options: {
      bare_large: "Larger icons with no tile behind them, drawn in the category colour, on a plain neutral button; swap in watercolour illustrations later once that artwork exists.",
      watercolour_now: "Ship watercolour illustrations now, before any such artwork exists.",
      tiles: "Keep the small line icons inside tinted tiles (as now).",
    },
    checks: { no_tile: "Does this drop the coloured tile behind the icon as the owner asked?", no_invented_art: "Does this avoid shipping artwork that does not exist yet?" },
  },
];

if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: Today log"];
let split = 0;
for (const d of DECISIONS) {
  const keys = Object.keys(d.options);
  const ask = (order) => client.systemOne({
    state: { context },
    questions: {
      pick: choice(`Based on \`context\`, ${d.question}`, Object.fromEntries(order.map((k) => [k, d.options[k]]))),
      ...Object.fromEntries(Object.entries(d.checks).map(([k, q]) => [k, noul(`Based on \`context\`, ${q}`)])),
    },
  });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask));
  const picks = runs.map((r) => r.answers.pick.choice);
  if (picks[0] !== picks[1]) split++;
  runs.forEach((r, i) => lines.push(`${d.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})` +
    Object.keys(d.checks).map((k) => `, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${d.id}: ${picks[0] === picks[1] ? `agreed on ${picks[0]}` : "SPLIT between orders, ask the owner"}`);
}
mkdirSync("evals/results", { recursive: true });
writeFileSync("evals/results/decision-today-log.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
