// Decision eval: the Health > Weight tab layout and where the partner insurance card goes.
// Run: node evals/decisions/health-weight.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-health-weight.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app for families. Health has tabs: Meds, Vaccines, Heat, Weight.",
  "Weight tab now: a full-width lime 'Log weight' button with a scale icon; then a list of entries ('46 kg · 17 Oct 2026 · You') whose only action is a delete x; a trend line chart appears only from two entries; then a large 'Partner · Pet insurance' advert card that also appears on every Health tab, with its heart icon vertically centred and out of line with the text.",
  "The owner said: remove the weird icon on the button, and UX-wise this page is not good.",
  "Design system: lime is for the one main action; one feature card per screen; secondary actions are soft buttons; list rows can open an edit sheet.",
];
const DECISIONS = [
  { id:"layout", question:"How should the Weight tab be laid out?", options:{
      summary_first:"A summary card first: current weight large, the change since the previous weigh-in and its date, the trend chart inside it once there are two entries, and the 'Log weight' button (no icon) in the card. Below, a 'History' list where tapping a row opens it to edit or delete.",
      button_first:"Keep the full-width button on top, then the list with delete buttons (as now), without the icon.",
      chart_first:"A large chart first, then the button, then the list.",
    }, checks:{ answers_question:"Does it show the current weight and trend first?", safe_delete:"Is delete kept but not the main row action?" } },
  { id:"insurance", question:"Where should the partner insurance card go?", options:{
      vaccines_bottom_quiet:"Only on the Vaccines tab, at the bottom, as a quiet row (small label 'Partner', title, one line, link) with the icon aligned to the top.",
      every_tab:"Keep it on every Health tab as a large card (as now).",
      remove:"Remove it from Health entirely.",
    }, checks:{ less_dominant:"Does the advert stop dominating the health data?" } },
];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const lines = ["Decision eval: health weight"]; let split = 0;
for (const D of DECISIONS){ const keys = Object.keys(D.options);
  const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
    ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice); if (picks[0]!==picks[1]) split++;
  runs.forEach((r,i)=>lines.push(`${D.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${D.id}: ${picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner"}`); }
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-health-weight.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(split?1:0);
