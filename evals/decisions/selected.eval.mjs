// Decision eval: one selected style for option cards across Kudi (pantry type, species, life stage, sheet choices).
// Run: node evals/decisions/selected.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-selected.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app with neutral greys, lime only for main actions (primary buttons, switches on, done ticks) and pink only where it carries meaning (notification dot, hearts, the pet's 'Now' marker, the current user).",
  "Selectable option cards appear in several places: pantry item type (Food, Treat, Toy), species on onboarding (Dog, Cat), life stage on the age guide, and choice buttons in sheets. Today they are inconsistent: some show a pink outline when selected, the life stage shows an ink (near-white in dark, near-black in light) outline.",
  "The segmented control uses a raised neutral segment for the selected tab. Text input focus uses an ink border.",
  "The owner asked to make things consistent everywhere and earlier said not to exaggerate with pink.",
];
const DECISIONS = [{
  id: "selected_card",
  question: "Which selected style should every option card use?",
  options: {
    ink: "Ink outline (1.5 px, the text colour), same as input focus.",
    pink: "Pink outline.",
    lime: "Lime outline, the primary action colour.",
  },
  checks: { consistent: "Is this consistent with the rest of the system?", meaning: "Does it keep pink and lime for their own meanings?" },
}];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: selected option card"]; let split = 0;
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
mkdirSync("evals/results", { recursive: true });
writeFileSync("evals/results/decision-selected.txt", lines.join("\n") + "\n");
console.log(lines.join("\n")); process.exit(split ? 1 : 0);
