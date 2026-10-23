// Decision eval: MVP structure of Kudi (navigation, calendar, free-plan scope, age guide entry).
// Options are asked in two orders to catch position bias.
// Run: node evals/decisions/mvp.eval.mjs   (needs TYPESAFE_API_KEY; writes evals/results/decision-mvp.txt)
import "./env.mjs";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";

const context = [
  "Kudi is a pet-care mobile app (dogs and cats) being cut down to an MVP for a first iOS release. English only, dark mode only, free plan only (no subscription), Google sign-in.",
  "Full app tabs today: Today (status, next meal, today's checklist, coming up), Health (meds, vaccines, heat, weight), Food (meals, pantry, age guide), Travel (trips with vet and paperwork checklists), Me (profile, family, reminders, settings).",
  "Owner's MVP brief: hide the pantry; move the age guide to Home behind a tappable age line under the greeting; hide quick log; move Pawmates (swipe to find playmates nearby, matches, chat) from a Home header icon into the bottom tab bar; travel is not always needed, so combine meals and travel into one calendar-style view where the owner logs everything, including one-off things like a groomer or vet visit.",
  "Meal times are daily and repeat; trips are dated with checklist steps that have due dates; vaccines and medicine have due dates in Health.",
  "Family sharing (invite family to see who fed) and Pawmates were behind the paid Family Plan. Family sync needs a server that is not set up yet; Pawmates profiles are sample data for now.",
];

const DECISIONS = [
  { id: "tabs", question: "Which bottom tab bar should the MVP have?",
    options: {
      five: "Today, Calendar, Health, Pawmates, Me.",
      four_health_in_calendar: "Today, Calendar, Pawmates, Me; Health records move into Calendar and Me.",
      five_care: "Today, Care (meals, health and calendar together), Pawmates, Me, plus a centre add button.",
    },
    checks: { clear: "Is each tab's purpose clear from its name?", scope: "Does it fit the owner's MVP brief?" } },
  { id: "calendar", question: "How should the Calendar tab be laid out on a phone?",
    options: {
      week_agenda: "A week strip at the top (7 days, today marked, dots on days with events) and below it the selected day's agenda in time order: meals with fed state, medicine doses, vet, groomer, trip steps. One add button to log a new event; month view one tap away.",
      month_grid: "A full month grid on top with dots, and the selected day's list below.",
      list_only: "A single scrolling list of upcoming events grouped by day, no calendar grid.",
    },
    checks: { daily: "Does it make the daily routine (meals, doses) quick to check and tick off?", oneoff: "Does it make one-off events like a groomer visit easy to add and find?" } },
  { id: "free_scope", question: "With no paid plan in the MVP, what happens to the features that were behind Family Plan?",
    options: {
      pawmates_free_family_local: "Pawmates is free. Family stays on this device: you can add the people who help (so logs show who fed), but invite links and live sync are hidden until the server exists.",
      all_free: "Everything is free, including family invite links and live sync.",
      hide_both: "Hide Pawmates and family until a paid plan exists.",
    },
    checks: { honest: "Does it avoid promising things that do not work yet?", brief: "Does it keep Pawmates in the tab bar as the owner asked?" } },
  { id: "age_line", question: "How should the age line under 'Hey, Bubu' on Home look?",
    options: {
      link_row: "A text line in the secondary text colour, for example '2 years 1 month old', followed by a small chevron, the whole line tappable; it opens the age guide page for that life stage.",
      pill: "A rounded pill chip with the age.",
      card: "A separate card under the header: 'Puppy, 2 to 12 months. See what to feed.'",
    },
    checks: { quiet: "Does it stay quiet under the greeting?", discoverable: "Is it clear that it can be tapped?" } },
];

if (!process.env.TYPESAFE_API_KEY) { console.log("Skipped: no TYPESAFE_API_KEY."); process.exit(0); }
const client = new TypeSafeClient();
const lines = ["Decision eval: MVP structure"]; let split = 0;
for (const d of DECISIONS) {
  const keys = Object.keys(d.options);
  const ask = (order) => client.systemOne({ state: { context }, questions: {
    pick: choice(`Based on \`context\`, ${d.question}`, Object.fromEntries(order.map((k) => [k, d.options[k]]))),
    ...Object.fromEntries(Object.entries(d.checks).map(([k, q]) => [k, noul(`Based on \`context\`, ${q}`)])) } });
  const runs = await Promise.all([keys, [...keys].reverse()].map(ask));
  const picks = runs.map((r) => r.answers.pick.choice); if (picks[0] !== picks[1]) split++;
  runs.forEach((r, i) => lines.push(`${d.id} order ${i}: pick=${r.answers.pick.choice} (conf ${r.answers.pick.confidence.toFixed(2)})` + Object.keys(d.checks).map((k) => `, ${k}=${r.answers[k].noul.toFixed(2)}`).join("")));
  lines.push(`${d.id}: ${picks[0] === picks[1] ? `agreed on ${picks[0]}` : "SPLIT between orders, ask the owner"}`);
}
mkdirSync("evals/results", { recursive: true }); writeFileSync("evals/results/decision-mvp.txt", lines.join("\n") + "\n");
console.log(lines.join("\n")); process.exit(split ? 1 : 0);
