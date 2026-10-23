// Decision eval: the life-stage picker in Food > Age guide, which competes with the tabs above it.
// Run: node evals/decisions/age-filter.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-age-filter.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi mobile app, Food page. At the top: a segmented control for Meals / Pantry / Age guide. Inside Age guide: a second segmented control with four life stages (Newborn 0 to 2 mo, Puppy 2 to 12 mo, Adult 1 to 7 yrs, Senior 7+ yrs), each with two text lines. Below: food, treats and toys advice for the chosen stage.",
  "The owner says the stage picker competes with the top tabs: two identical controls stacked.",
  "The pet's own current stage is known from its birthday; people mostly read their pet's stage and sometimes peek ahead.",
  "Design system: neutral greys, lime only for main actions, pink only for meaning (for example 'you are here'), flat surfaces.",
];
const D = { id:"age_filter", question:"Which control should pick the life stage?", options:{
  timeline:"A life-stage timeline: four stops on a thin horizontal line, each a small dot with the stage name and age range under it; the pet's current stage gets a pink 'Now' marker; the selected stop's dot is filled and its name in full text colour. Clearly different from the tabs above.",
  outline_chips:"A row of four outlined chips, the selected one with a border.",
  stage_cards:"Swipeable cards, one per stage, with the advice inside each.",
}, checks:{ distinct:"Does it look clearly different from the tabs above?", shows_now:"Does it show where the pet is now?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: age filter"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-age-filter.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
