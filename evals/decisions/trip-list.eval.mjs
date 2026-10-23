// Decision eval: how trip cards in the Travel list stay distinguishable when there are several trips.
// Run: node evals/decisions/trip-list.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-trip-list.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app. The Travel tab lists trips. Each trip card has a painted banner (a suitcase and paper plane on green, about 96 px tall), then 'Tbilisi -> London', the date and days to go, a progress bar and 'x of y steps'.",
  "Every card uses the same banner, so with two or more trips the cards look identical at a glance. The owner said: if I add a different country I cannot tell them apart by the image.",
  "There is no budget for new painted art per country right now. Destinations are free text plus a rule set (EU, UK, Turkey, other).",
  "The detail page of a trip also shows the banner.",
];
const DECISIONS = [{
  id: "trip_list", question: "How should the trip list make each trip easy to tell apart?",
  options: {
    name_on_art: "Keep the banner but write the destination name large on it, like a painted luggage label (for example LONDON), so the image itself differs per trip.",
    compact: "Drop the banner from list cards (keep it on the trip detail page). List cards lead with the destination name as the title, date and days to go, and progress, so the text does the differentiating and more trips fit on screen.",
    first_only: "Show the banner only on the next upcoming trip; later trips are compact rows.",
  },
  checks: { distinct: "Can the user tell trips apart at a glance?", fits_system: "Does it avoid inventing new art?" },
}];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient(); const lines = ["Decision eval: trip list"]; let split = 0;
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
mkdirSync("evals/results", { recursive: true }); writeFileSync("evals/results/decision-trip-list.txt", lines.join("\n") + "\n");
console.log(lines.join("\n")); process.exit(split ? 1 : 0);
