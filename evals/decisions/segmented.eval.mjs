// Decision eval: the segmented control (Health tabs, Food tabs, language, age stages).
// Run: node evals/decisions/segmented.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-segmented.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app, dark mode shown. A segmented control switches sub-views: Health (Meds, Vaccines, Heat, Weight), Food (Meals, Pantry, Age guide), Language, and the age stages in the Age guide.",
  "Now: a filled grey pill-shaped track, inside it a lighter filled pill for the selected item with a drop shadow, and the track has a visible darker edge. The owner says a lot of things are going on here and asks to fix the UX.",
  "Design system: neutral greys, lime only for the main action, pink only for meaning, flat surfaces, Figtree type. Other controls in the app: plain progress bars, neutral tiles, text links without underline.",
];
const D = { id:"segmented", question:"How should the segmented control look?", options:{
  flat_pill:"Keep a segmented control but flat: one quiet track, the selected item a solid lighter pill with no shadow and no edge; unselected labels in secondary text.",
  underline_tabs:"Plain text tabs with no track: selected label in full text colour with a short 2px line under it, others in secondary text.",
  chips:"Separate rounded chips, the selected one filled.",
}, checks:{ calmer:"Is this visually calmer than now?", clear_selection:"Is the selected item still obvious?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: segmented"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-segmented.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
