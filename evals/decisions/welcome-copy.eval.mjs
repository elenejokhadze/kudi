// Decision eval: what the welcome screen keeps once it becomes "one big message and one action".
// Options are asked in two orders to catch position bias.
// Run: node evals/decisions/welcome-copy.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-welcome-copy.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a mobile pet-care app shared by a family. The welcome screen is the first thing a new user sees, over a full-screen illustration of five dogs on solid green.",
  "Today it has: the kudi wordmark and a language pill, the headline 'Fed, dosed and ready to travel.', a two-line tagline, four feature chips, a lime 'Add my pet' button and a secondary 'Explore with a sample pet' button.",
  "The owner said: this is a welcome screen, so it should have one big message and one action, 'add my pet' or explore.",
  "'Add my pet' starts a 3-step setup. 'Explore with a sample pet' loads a demo pet so people can look around before setting up.",
  "The screen must fit one phone screen with no scrolling.",
];

const DECISIONS = [
  {
    id: "actions",
    question: "Which actions should the welcome screen show?",
    options: {
      primary_plus_link: "One lime 'Add my pet' button, with 'Explore with a sample pet' as a small text link under it.",
      primary_only: "Only the lime 'Add my pet' button; remove the explore option.",
      two_buttons: "Keep both as full buttons (as now).",
    },
    checks: { one_action: "Does this read as one action to the owner?", keeps_demo: "Can a curious user still try the app without setting up?" },
  },
  {
    id: "message",
    question: "What text should the welcome screen keep besides the wordmark and language pill?",
    options: {
      headline_only: "Only the big headline; remove the tagline and the four feature chips.",
      headline_and_line: "The big headline and one short line under it; remove the feature chips.",
      all: "Headline, tagline and feature chips (as now).",
    },
    checks: { one_message: "Does this read as one big message?" },
  },
];

if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: welcome copy"];
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
writeFileSync("evals/results/decision-welcome-copy.txt", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(split ? 1 : 0);
