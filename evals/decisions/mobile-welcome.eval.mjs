// Decision eval: how Kudi presents on wide screens (it is a mobile app) and how the welcome
// illustration fits behind the copy on a phone. Options are asked in two orders to catch position bias.
// Run: node evals/decisions/mobile-welcome.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-mobile-welcome.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care web app shared by a family, installable to the phone home screen. The owner said: it should be a mobile app, please make it mobile view.",
  "Every app screen is already a centred 480 px column, but the welcome screen paints its illustration across the whole browser window. On a laptop the dogs are blown up to the full window width, cropped, and the headline, feature chips and buttons sit on top of the dogs.",
  "The owner also asked that the welcome screen does not scroll: it must fit exactly one screen.",
  "The welcome illustration is a tall portrait image (852 x 1846). Five dogs fill the top 62%; the bottom 38% is plain solid green made for copy and buttons.",
  "Welcome copy, top to bottom: kudi wordmark and language pill, a two-line headline, a two-line tagline, four feature chips in a 2 x 2 grid, a lime primary button and a secondary button. Together about 430 px tall at the bottom of the screen.",
  "On a 390 x 844 phone the image fitted to the width ends its dogs at about 520 px, so the copy block (starting near 414 px) overlaps the lowest dogs by about 100 px.",
  "Sheets, tab bar, toasts and reminders are position: fixed and centred to the 480 px column; scroll restore uses window.scrollY. A phone-frame wrapper would need its own scroll container and changes to that code.",
];

const DECISIONS = [
  {
    id: "wide_screen",
    question: "How should Kudi look when opened in a wide desktop browser?",
    options: {
      column: "Keep the 480 px phone-width column for every screen, including welcome: the illustration fills only the column, the area around it is a calm neutral backdrop.",
      phone_frame: "Draw a phone device frame (about 390 x 844) in the middle of the desktop window and run the app inside it.",
      full_bleed: "Keep the welcome illustration across the whole browser window (as now).",
    },
    checks: {
      is_mobile_view: "Does this make the app read as a mobile app on a laptop?",
      low_risk: "Is this low risk for the fixed sheets, tab bar and scroll restore?",
    },
  },
  {
    id: "art_fit",
    question: "On a phone, how should the welcome illustration fit so the copy and buttons sit on the plain green and the screen does not scroll?",
    options: {
      scale_down: "Scale the illustration so the dogs end above the copy block; the matching solid green of the image fills the rest of the screen behind the copy.",
      cover_overlap: "Fill the screen with the illustration at full width and let the copy overlap the lowest dogs.",
      drop_chips: "Keep the image at full width and remove the four feature chips so the copy is shorter.",
    },
    checks: {
      keeps_content: "Does this keep all the welcome content the owner already has?",
      readable: "Does the copy stay readable on plain green without covering the dogs?",
    },
  },
];

if (!process.env.TYPESAFE_API_KEY) {
  console.log("Skipped: put TYPESAFE_API_KEY=... in .env.local (or the environment) to run the Jev decision evals.");
  process.exit(0);
}

const client = new TypeSafeClient();
const lines = ["Decision eval: mobile view and welcome art"];
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
writeFileSync("evals/results/decision-mobile-welcome.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
