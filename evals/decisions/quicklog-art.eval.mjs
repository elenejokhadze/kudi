// Decision eval: how the painted quick-log illustrations sit in the buttons.
// Run: node evals/decisions/quicklog-art.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-quicklog-art.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi Today screen, mobile. Quick log is a row of three equal buttons (about 114px wide each): Treat, Walk, Water. Each button shows an illustration, the name, and a line like '2 · You 21:07' or 'Not yet'. Tapping logs one more.",
  "The owner supplied hand-painted illustrations in the welcome art's style: a biscuit bone (treat), a green collar with a rust lead (walk), a mustard water bowl with a drop (water). Transparent backgrounds, roughly square.",
  "The previous coded drawings were 56px. The owner earlier said icons elsewhere were too tiny. Buttons sit on dark glass over a green-to-black background.",
];
const D = { id:"size", question:"How large should the illustration be in each quick-log button?", options:{
  art_64:"64px illustration centred above the name, button grows slightly; the art reads as the main element without crowding the text.",
  art_56:"Keep 56px as before.",
  art_88:"88px illustration filling most of the button width, name and count below.",
}, checks:{ legible:"Will the painted detail be legible at this size on a phone?", balanced:"Does the button stay balanced with the name and count?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: quick-log art"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-quicklog-art.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
