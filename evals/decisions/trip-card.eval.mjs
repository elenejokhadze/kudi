// Decision eval: layout of the trip summary card after the owner said it still feels weird.
// Run: node evals/decisions/trip-card.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-trip-card.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app. A trip has a flight date and a checklist of 7 to 8 steps (microchip, rabies vaccine, blood test, certificates).",
  "The trip summary card now: a painted suitcase scene on top; then a small label 'Flying 17 Mar 2027'; a 56px number '151' with a small grey 'days' beside it; a thin empty grey progress bar (0% done); then '0% ready · 0 of 7 steps'. The owner says it still feels weird visually.",
  "Problems seen: at 0% the empty bar looks like missing content; 'days' alone does not say what the number means; the big number floats with lots of empty space; readiness repeats the same fact twice (0% and 0 of 7).",
  "Design system: one display number per screen (56 medium); h3 18; title 16; label 13. A 'dose track' pattern exists: one small capsule per step, filled when done, the next one outlined in pink.",
];
const D = { id:"trip_card", question:"Which layout should the trip summary card use?", options:{
  countdown_steps:"'151 days to go' as one line (display number + 'days to go' in h3, baseline-aligned), the date as a label above; below, one capsule per checklist step (filled = done, next outlined pink) and one line 'Next: Microchip' with '0 of 7 ready' on the right.",
  two_stats:"Two equal stat blocks side by side: '151 days to go' and '0 of 7 steps ready', each h1 with a label, then the progress bar.",
  as_now_tight:"Keep the current layout and only tighten the spacing.",
}, checks:{ explains_number:"Does the number now say what it counts?", empty_state_ok:"Does it still look complete when nothing is done yet?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: trip card"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-trip-card.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
