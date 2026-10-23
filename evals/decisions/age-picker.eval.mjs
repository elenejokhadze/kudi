// Decision eval: the life-stage picker on Food > Age guide. Options asked in two orders to catch position bias.
// Run: node evals/decisions/age-picker.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-age-picker.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app. Food & play has three top tabs (Meals, Pantry, Age guide) as a segmented control.",
  "Age guide shows food, treats and toys advice for one life stage. There are 4 stages: Newborn 0 to 2 mo, Puppy 2 to 12 mo, Adult 1 to 7 yrs, Senior 7+ yrs. The pet's current stage is chosen by default from its birthday.",
  "Most visits only need the current stage; some owners peek at the next stage to prepare.",
  "Tried and rejected by the owner: a second segmented control (competed with the top tabs), a timeline with dots where 'Now' and 'Selected' were two different markers (confusing), and a pill stepper with previous/next arrows around the stage name (hides the other stages, feels clumsy).",
];
const DECISIONS = [{
  id: "age_picker",
  question: "Which component should pick the life stage?",
  options: {
    cards: "A row of four small stage cards (name and age range), all visible in one line; the selected card has a solid outline; the pet's current stage carries a small 'Now' caption. It looks like content cards, not tabs.",
    stepper: "Keep the pill stepper with previous/next arrows around the stage name.",
    sheet: "Show the current stage as a header row ('Puppy, 2 to 12 mo, Now') with a 'Change' link that opens a bottom sheet listing the four stages.",
  },
  checks: {
    visible: "Does it show all stages at a glance?",
    no_tab_clash: "Does it avoid looking like a second set of tabs?",
  },
}];

if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: life-stage picker"];
let split = 0;
for (const d of DECISIONS) {
  const keys = Object.keys(d.options);
  const ask = (order) => client.systemOne({ state: { context }, questions: {
    pick: choice(`Based on \`context\`, ${d.question}`, Object.fromEntries(order.map((k) => [k, d.options[k]]))),
    ...Object.fromEntries(Object.entries(d.checks).map(([k, q]) => [k, noul(`Based on \`context\`, ${q}`)])),
  } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask));
  const picks = runs.map((r) => r.answers.pick.choice);
  if (picks[0] !== picks[1]) split++;
  runs.forEach((r, i) => lines.push(`${d.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})` + Object.keys(d.checks).map((k) => `, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${d.id}: ${picks[0] === picks[1] ? `agreed on ${picks[0]}` : "SPLIT between orders, ask the owner"}`);
}
mkdirSync("evals/results", { recursive: true });
writeFileSync("evals/results/decision-age-picker.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
