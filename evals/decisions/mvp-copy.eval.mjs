// Decision eval: MVP welcome copy (headline and sign-in wording). Asked in two orders.
// Run: node evals/decisions/mvp-copy.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-mvp-copy.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a pet-care iPhone app for dog and cat owners. MVP features: Today (what is due now: meals, medicine), Calendar (meals, groomer, vet, walks, trips), Health (medicine, vaccines, heat, weight), an age guide (what to feed at each age) and Pawmates (find playmates nearby).",
  "The welcome screen shows a painted illustration of five dogs walking together, one big headline, a Google sign-in button and a small link to explore with a sample pet.",
  "The headline must fit two lines on a phone, plain English, no exclamation marks, no jargon. The old headline was 'Fed, dosed and ready to travel.' but travel is now a small part of the app.",
];
const DECISIONS = [
  { id: "headline", question: "Which welcome headline is best for the MVP?",
    options: {
      care_one_place: "Your pet's care, all in one place.",
      meals_vet: "Every meal, dose and vet visit, sorted.",
      never_miss: "Never miss a meal, dose or vet visit.",
      old: "Fed, dosed and ready to travel.",
    },
    checks: { clear: "Is it immediately clear what the app does?", fits: "Does it fit two lines on a phone in a large headline?" } },
  { id: "google_button", question: "Which label should the Google sign-in button use?",
    options: { continue: "Continue with Google", signin: "Sign in with Google", signup: "Sign up with Google" },
    checks: { new_and_returning: "Does it work for both new and returning users?" } },
];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient(); const lines = ["Decision eval: MVP copy"]; let split = 0;
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
mkdirSync("evals/results", { recursive: true }); writeFileSync("evals/results/decision-mvp-copy.txt", lines.join("\n") + "\n");
console.log(lines.join("\n")); process.exit(split ? 1 : 0);
