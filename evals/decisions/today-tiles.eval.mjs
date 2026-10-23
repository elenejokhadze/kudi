// Decision eval: colours of the small icon tiles in the Today checklist.
// Run: node evals/decisions/today-tiles.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-today-tiles.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi Today screen, dark green-to-black background. The 'Today' checklist lists meals and medicine doses in time order. Each row: time, a small icon tile, the name, who did it or 'Late' in pink, and an action.",
  "Tile colours now: a pending meal has a dark mustard-yellow tile with a yellow bowl icon (the 'feeding' category colour); a pending dose has a dark pink tile (the 'medicine' category colour); a done item has a neutral grey tile with a lime check.",
  "The owner asked: why these colours here? Elsewhere the owner has asked for fewer colours, neutral components, lime only for main actions and pink only where it means something.",
  "Status is already said in words in each row ('Late', 'Up next', 'You · 08:12').",
];
const D = { id:"today_tiles", question:"How should the checklist tiles be coloured?", options:{
  neutral_status:"All tiles neutral grey with a plain icon (bowl for meal, pill for dose); a done item shows a check in the same neutral tile; status stays in the words, with 'Late' as the only colour.",
  category_tints:"Keep category tints: yellow for meals, pink for medicine, lime check when done (as now).",
  status_tints:"Tint by status instead of category: grey pending, green done, red late.",
}, checks:{ fewer_colours:"Does this use fewer colours as the owner asked?", status_clear:"Is each row's status still clear?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: Today tiles"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-today-tiles.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
