// Decision eval: second accent (pink or orange), its tone, how much of it the green feature card
// carries, and which single icon pack to use. Options are asked in two orders to catch position bias.
// Run: npm run eval:jev   (needs TYPESAFE_API_KEY; writes evals/results/decision-accent-and-icons.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app shared by a family: feeding log, medicine, vaccines, heat cycles, weight and travel.",
  "Screens are white with green-black text. The primary button is lime (#C9EA62) with dark forest-green text.",
  "Each screen may have one deep forest-green (#0B4A2C) feature card, for example a weekly feeding chart with lime bars.",
  "The owner said the pink on that green card felt exaggerated or the wrong tone: a pink headline, a pink tooltip, pink avatar rings and a pink badge, in a cool bubblegum pink (#F5A3E3).",
  "The owner asked to choose between pink and orange (#F2731F) as the second accent instead of using both.",
  "The owner earlier asked for a bit of pink in some details, and wants colour highlighted only on some design elements.",
  "The owner did not like the current icons, which were hand-drawn, and asked to choose one icon pack and align with it.",
  "The app is a single HTML page with no build step, using the Figtree font.",
];

const DECISIONS = [
  {
    id: "second_accent",
    question: "Which second accent colour should Kudi keep?",
    options: {
      pink: "Pink only, for small details; drop orange.",
      orange: "Orange only, for small details; drop pink.",
      both: "Keep both pink and orange as small accents.",
    },
    checks: { follows_owner: "Does keeping a single second accent follow what the owner asked?" },
  },
  {
    id: "pink_tone",
    question: "If pink is kept, which tone fits next to lime and deep forest green on white screens?",
    options: {
      bubblegum: "Cool bubblegum pink #F5A3E3 (as now).",
      warm_blush: "Warm, softer blush pink #F4B3C2.",
      hot: "Saturated hot pink #EC4899.",
    },
    checks: { calmer: "Would a softer, warmer pink feel calmer and less exaggerated on the green card?" },
  },
  {
    id: "feature_card_accent",
    question: "How much of the second accent should the green feature card carry?",
    options: {
      one_detail: "One small detail at most (the count badge); cream headline, cream tooltip, no coloured avatar rings; lime for the chart.",
      as_now: "Pink headline, pink tooltip, pink avatar rings and a pink badge (as now).",
      none: "No second accent at all on the card; only cream and lime.",
    },
    checks: { lime_stays_focus: "Should lime stay the strongest colour on the card so the chart reads first?" },
  },
  {
    id: "icon_pack",
    question: "Which single icon pack should Kudi use?",
    options: {
      lucide: "Lucide: about 1,500 rounded outline icons on a 24 px grid, adjustable stroke, includes paw-print, dog, bone, pill, syringe, weight and luggage; static SVGs need no build; ISC license.",
      phosphor: "Phosphor: about 1,200 icons in six weights including fill and duotone, includes paw-print, dog, bone, pill and syringe; MIT license.",
      material: "Material Symbols Rounded: Google's variable icon font with filled and outlined styles, includes pets and medication.",
      tabler: "Tabler Icons: about 5,000 outline icons on a 24 px grid with a 2 px stroke; MIT license.",
    },
    checks: { single_pack: "Should the whole app use only icons from this one pack, with no hand-drawn icons?" },
  },
];

if (!process.env.TYPESAFE_API_KEY) {
  console.log("Skipped: put TYPESAFE_API_KEY=... in .env.local (or the environment) to run the Jev decision evals.");
  process.exit(0);
}

const client = new TypeSafeClient();
const lines = ["Decision eval: accent and icons"];
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
writeFileSync("evals/results/decision-accent-and-icons.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
