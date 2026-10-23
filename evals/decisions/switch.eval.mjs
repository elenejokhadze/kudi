// Decision eval: the colour of a switch's "on" state, to record as a design-system token.
// Run: node evals/decisions/switch.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-switch.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi mobile pet-care app, light and dark themes. Switches turn reminders and settings on or off (lists of five or six switches in a sheet, dark mode mostly).",
  "Tokens: --color-primary is lime #C9EA62 with dark text, described as 'the one prominent colour: primary action'. --color-brand is forest green in light and pink in dark. --color-ink is the text colour (green-black in light, cream in dark). Pink is reserved for meaning (you, attention, next step). Surfaces are neutral greys.",
  "History: switches used --color-brand (pink in dark, green in light); the owner asked to cut pink that does not mean something. They were then set to --color-ink (cream on), and the owner asked what the design system actually says. There is no switch token yet.",
  "On a switch, 'on' must be clearly distinct from 'off' (off track is a neutral grey) in both themes.",
];
const D = { id:"switch_on", question:"Which colour should a switch use when it is on?", options:{
  primary:"Lime (--color-primary), the same accent in both themes, with a dark knob; lime means 'active/on' as well as the main action.",
  ink:"The text colour (--color-ink): cream in dark, green-black in light, with a contrasting knob.",
  brand:"The brand colour (--color-brand): green in light, pink in dark.",
}, checks:{ clear_state:"Is on clearly distinct from off in both themes?", consistent:"Is it the same meaning across themes and with the rest of the system?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: switch on"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-switch.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
