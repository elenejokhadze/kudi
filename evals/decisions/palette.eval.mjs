// Decision eval: how should the Froli-style palette be used in the Kudi app?
// Each decision is asked with its options in two orders to catch position bias.
// Run: npm run eval:jev   (needs TYPESAFE_API_KEY; writes evals/results/decision-palette.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app shared by a family: feeding log, medicine, vaccines, heat cycles, weight and travel.",
  "The owner wants the app to feel clean, like a modern weather or hiking app: white screens, calm grey surfaces, dark text.",
  "The owner wants brand colours highlighted only on some design elements, and the button colour clearly defined and prominent.",
  "The brand palette follows a pet-food identity: deep forest green (#0B4A2C), bubblegum pink (#F5A3E3), lime (#C9EA62), cream (#FBF8F0), with orange (#F2731F) and yellow (#F4CF34).",
  "The owner asked for a bit of pink in some details.",
  "Most screens have one main action, such as Log dinner, Give medicine or Book vaccine.",
];

const DECISIONS = [
  {
    id: "primary_button",
    question: "Which colour should the primary action button use?",
    options: {
      lime: "Lime fill with dark forest-green text (about 11 to 1 contrast).",
      forest: "Deep forest-green fill with cream text (about 11 to 1 contrast).",
      pink: "Bubblegum pink fill with dark forest-green text (about 8 to 1 contrast).",
    },
    checks: { one_per_screen: "Should each screen have at most one button in the primary colour so it stays easy to find?" },
  },
  {
    id: "green_role",
    question: "Where should the deep forest green appear?",
    options: {
      ink_and_feature: "As a green-black text colour, plus at most one deep-green feature card per screen with a pink headline.",
      chrome: "As a solid green header and tab bar on every screen.",
      background: "As the full background colour of every screen, with cream text.",
    },
    checks: { stays_clean: "Does the chosen option keep most of each screen white or light grey?" },
  },
  {
    id: "pink_role",
    question: "How should pink be used?",
    options: {
      details: "Only small details: notification dots, count badges, avatar rings, hearts, the active tab dot and selected chips.",
      secondary_buttons: "As the fill of every secondary button.",
      card_backgrounds: "As the background of medicine and reminder cards.",
    },
    checks: { competes_with_primary: "Would the chosen option compete with the primary button for attention?" },
  },
  {
    id: "spark_role",
    question: "How should orange and yellow be used?",
    options: {
      sparks: "Rarely, as small sparks: a 'New' sticker, a streak, a celebration, and the feeding category tile.",
      danger: "Orange as the danger colour for delete and overdue states.",
      none: "Leave orange and yellow out of the app entirely.",
    },
    checks: { readable: "Should text placed on orange use dark green rather than cream so it meets 4.5 to 1 contrast?" },
  },
];

if (!process.env.TYPESAFE_API_KEY) {
  console.log("Skipped: put TYPESAFE_API_KEY=... in .env.local (or the environment) to run the Jev decision evals.");
  process.exit(0);
}

const client = new TypeSafeClient();
const lines = ["Decision eval: palette usage"];
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
writeFileSync("evals/results/decision-palette.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
