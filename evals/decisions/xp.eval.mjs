// Decision eval: one consistent way to show XP rewards.
// Run: node evals/decisions/xp.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-xp.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app for families with light gamification: actions earn XP, XP fills levels and badges on the Me page.",
  "XP now appears in many forms: a large lime pill '+5 XP' (18px bold) that floats up from the tapped button and wraps onto two lines over small buttons; button labels like 'Save · +5 XP' and 'Start caring · +50 XP'; notes like '+20 XP per step' and '+5 XP each'; toasts like 'Welcome! Bubu is all set. +50 XP'; and the badge modal button 'Nice! +30 XP'.",
  "The owner says it is inconsistent across places. The app's core job is caring for the pet; XP is a light reward. Buttons should say what they do.",
  "Design system: lime is the main-action colour; toasts are dark pills with label-size text; type scale label 13, title 16, h3 18.",
];
const D = { id:"xp", question:"What single XP pattern should the app use?", options:{
  toast_only:"XP appears in one place only: the confirmation toast after an action, as a small trailing part ('Water logged · +5 XP'), in the same label style everywhere. Remove the floating pill, XP from button labels, and the '+N XP per step/each' notes. Levels and totals stay on Me.",
  float_only:"Keep only a small one-line floating chip near the tap (label size); remove XP from buttons, notes and toasts.",
  everywhere_consistent:"Keep XP in all places but make every instance the same small chip style.",
}, checks:{ consistent:"Is XP shown one consistent way?", buttons_clear:"Do buttons say only what they do?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: XP"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-xp.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
