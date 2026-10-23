// Decision eval: type hierarchy on the trip screen, and the trip ticket card on the Travel list.
// Options are asked in two orders to catch position bias.
// Run: node evals/decisions/trip-type.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-trip-type.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app. The trip screen shows a header 'Tbilisi -> EU country', then a summary card: 'Flying 17 Mar 2027', days to go (151), percent of checklist ready (38%), and a progress bar.",
  "The owner said the typography sizes there are crazy. Today the header is 24px, days is 40px weight 800, the percent is 34px weight 800, 'days' is 18px. None of these are on the design system scale, and 800 is above the allowed 400-700 weights.",
  "Design system type scale: display 56/60 medium (rule: one big number per screen), h1 28/34 bold (screen titles), h2 22/28 semibold (card headlines), h3 18/24 semibold, title 16/22 semibold, body 15/22, label 13/18 medium, caption 12/16.",
  "The Travel list shows each trip as a ticket card: plane icon tile, route, date and days to go, a dashed tear line with half-circle notches cut into both sides, a progress bar and 'Next step'. The owner said the border on top of the ticket feels weird and the card is too plain; they want an illustration in the welcome screen's hand-painted style, about travel.",
];
const DECISIONS = [
  {
    id: "trip_hero",
    question: "How should the trip summary card set its type?",
    options: {
      one_display: "Days as the one display number (56 medium) with 'days' in h3 beside it; the date as a label above; '38% ready' as a title-size line next to the progress bar.",
      two_h1: "Days and percent both as h1 (28 bold) side by side, date as label.",
      two_big: "Days as display (56) and percent as h1 (28) side by side, as now but snapped to the scale.",
    },
    checks: { one_big_number: "Does this keep one big number on the screen?", on_scale: "Is every size from the scale?" },
  },
  {
    id: "ticket",
    question: "How should the trip ticket card on the Travel list look?",
    options: {
      art_top: "A painted travel illustration across the top of the card (a suitcase with a luggage tag and a paper plane trail, in the welcome art's colours), then route, date, progress and next step; no notches or tear line.",
      keep_notches: "Keep the dashed tear line and notches, add a small illustration in place of the plane tile.",
      plain: "Remove the notches and tear line, keep the plane tile, no illustration.",
    },
    checks: { fixes_border: "Does this remove the border detail the owner found weird?", less_plain: "Does this make the card less plain as asked?" },
  },
];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: trip type and ticket"];
let split = 0;
for (const d of DECISIONS) {
  const keys = Object.keys(d.options);
  const ask = (order) => client.systemOne({ state: { context }, questions: {
    pick: choice(`Based on \`context\`, ${d.question}`, Object.fromEntries(order.map((k) => [k, d.options[k]]))),
    ...Object.fromEntries(Object.entries(d.checks).map(([k, q]) => [k, noul(`Based on \`context\`, ${q}`)])) } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask));
  const picks = runs.map((r) => r.answers.pick.choice);
  if (picks[0] !== picks[1]) split++;
  runs.forEach((r, i) => lines.push(`${d.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})` +
    Object.keys(d.checks).map((k) => `, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${d.id}: ${picks[0] === picks[1] ? `agreed on ${picks[0]}` : "SPLIT between orders, ask the owner"}`);
}
mkdirSync("evals/results", { recursive: true });
writeFileSync("evals/results/decision-trip-type.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
