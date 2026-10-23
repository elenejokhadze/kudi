// Decision eval: the bell on Today and the structure of the Reminders sheet.
// Run: node evals/decisions/reminders.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-reminders.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
const context = [
  "Kudi mobile pet-care app. Today shows 'Up next' (the one due item with a big button) and a 'Today' checklist of meals and doses in time order. A reminder banner also drops in when something is due while the app is open.",
  "Today's header has a bell with a count; it opens the Reminders sheet. The Me page also has a 'Reminders' row that opens the same sheet.",
  "The sheet now: 'Pop-ups while Kudi is open' with six switches (Meals, Medicine, Vaccines, Trip deadlines, Heat, Sound), a 'Phone notifications' row, a 'Remind me' timing select, a 'Still to do today' list repeating today's open items, then an 'Add to Google Calendar' section with an explainer card and one Add link per meal, dose, vaccine and trip step. The owner says a lot is happening and asks whether the reminder is important on the home page.",
];
const DECISIONS = [
  { id:"bell", question:"What should happen with the bell on Today?", options:{
      remove_bell:"Remove the bell from Today: due items are already in Up next, the checklist and the drop-in banner; reminder settings live on Me only.",
      bell_due_only:"Keep the bell but make it open only the list of what is due now.",
      keep:"Keep the bell opening the full Reminders sheet (as now).",
    }, checks:{ less_duplication:"Does it remove duplication on Today?" } },
  { id:"sheet", question:"How should the Reminders settings be structured?", options:{
      two_groups:"Two short groups: 'Remind me about' (Meals, Medicine, Vaccines, Trips, Heat as one list with neutral switches) and 'How' (timing select, sound, phone notifications); drop the 'Still to do today' repeat; calendar becomes one row 'Add to phone calendar' that opens its own list.",
      as_now_cleaner:"Keep every section as now, just tighter spacing.",
      one_list:"One long list of every switch, select and calendar link.",
    }, checks:{ simpler:"Is it simpler to scan?" } },
];
if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped"); process.exit(0); }
const client = new TypeSafeClient(); const lines = ["Decision eval: reminders"]; let split = 0;
for (const D of DECISIONS){ const keys = Object.keys(D.options);
  const ask = (order) => client.systemOne({ state:{context}, questions:{ pick: choice(`Based on \`context\`, ${D.question}`, Object.fromEntries(order.map(k=>[k,D.options[k]]))),
    ...Object.fromEntries(Object.entries(D.checks).map(([k,q])=>[k, noul(`Based on \`context\`, ${q}`)])) } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask)); const picks = runs.map(r=>r.answers.pick.choice); if (picks[0]!==picks[1]) split++;
  runs.forEach((r,i)=>lines.push(`${D.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})`+Object.keys(D.checks).map(k=>`, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${D.id}: ${picks[0]===picks[1]?`agreed on ${picks[0]}`:"SPLIT between orders, ask the owner"}`); }
mkdirSync("evals/results",{recursive:true}); writeFileSync("evals/results/decision-reminders.txt", lines.join("\n")+"\n"); console.log(lines.join("\n")); process.exit(split?1:0);
