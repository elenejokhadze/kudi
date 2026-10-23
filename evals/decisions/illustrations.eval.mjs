// Decision eval: how to produce the missing illustrations in the welcome art's painted style.
// Run: node evals/decisions/illustrations.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-illustrations.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi is a mobile pet-care app. Its brand illustration is one hand-painted raster image (watercolour/gouache texture) of five dogs on solid green, used on the welcome screen.",
  "The owner wants more art in exactly that style: a sitting dog in frontal view for the home screen, a cat for the species picker, and three quick-log illustrations (treat, walk, water).",
  "Attempts so far: cropping a walking beagle from the welcome image (owner: dog should be sitting and frontal); hand-coded SVG drawings with a texture filter (owner: not in our illustration style).",
  "Available: an AI image generator inside Figma that can be prompted with a style description; it is paid per image (Figma AI credits) and places images into a Figma file the owner chooses. The owner can also commission or paint art themselves.",
];
const D = { id:"illustrations", question:"How should the missing illustrations be produced?", options:{
  generate_matched:"Generate them with the image generator, prompting with the welcome image's exact style (painted texture, palette, solid green ground), in one batch so they match each other; the owner reviews them before they go in the app.",
  more_svg:"Keep hand-coding SVG drawings and refine the texture filter.",
  wait_for_owner:"Leave placeholders until the owner supplies painted art.",
}, checks:{ matches_style:"Is this likely to match the painted welcome style?", owner_control:"Does the owner keep control over cost and the final art?" } };
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const keys = Object.keys(D.options); const lines = ["Decision eval: illustrations"];
const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
  ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice);
runs.forEach((r,i)=>lines.push(`order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
lines.push(picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner");
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-illustrations.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(picks[0]===picks[1]?0:1);
