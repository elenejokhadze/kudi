// Measured eval: renders every Kudi screen and sheet in light and dark, and checks the contrast of every
// piece of text against the colour actually behind it (WCAG AA: 4.5:1, or 3:1 for large text).
// Run with the app served on :3000:  node evals/contrast/scan.mjs   (needs playwright)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const APP_URL = process.env.KUDI_URL || 'http://localhost:3000/';
const measure = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r,g,b,a=1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return {r,g,b,a}; };
  const over = (top, bot) => ({ r: top.r*top.a + bot.r*(1-top.a), g: top.g*top.a + bot.g*(1-top.a), b: top.b*top.a + bot.b*(1-top.a), a: 1 });
  const lum = c => { const f = v => { v/=255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }; return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
  const bgOf = el => { const layers = []; let photo = false; for (let e = el; e; e = e.parentElement){ const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear')) photo = true; const c = parse(cs.backgroundColor); if (c && c.a > 0){ layers.push(c); if (c.a >= 1) break; } } let base = {r:255,g:255,b:255,a:1}; if (layers.length && layers[layers.length-1].a < 1){ base = parse(getComputedStyle(document.body).backgroundColor) || base; } return { c: layers.reverse().reduce((acc, l) => over(l, acc), base), photo }; };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());){
    const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || el.closest('svg,script,style,[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1 || cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[hidden]')) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    // mid-animation (a toast fading out, a page fading in) is not the resting colour: skip it
    if (op === 0) continue; // fully faded out (a finished toast)
    if (op < 1) { let moving = false; for (let e = el; e && !moving; e = e.parentElement) moving = e.getAnimations().some(a => a.playState === 'running'); if (moving) continue; }
    const fg0 = parse(cs.color); if (!fg0) continue; const { c: bg, photo } = bgOf(el); if (photo) continue;
    const fg = over({ ...fg0, a: fg0.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const px = parseFloat(cs.fontSize), w = +cs.fontWeight; const large = px >= 24 || (px >= 18.66 && w >= 700);
    const need = el.matches(':disabled, [disabled] *') ? 0 : large ? 3 : 4.5;
    if (ratio < need) out.push({ text: t.slice(0,48), ratio: +ratio.toFixed(2), need, color: cs.color, cls: el.className && String(el.className).slice(0,40) });
  }
  return out;
};
const b = await chromium.launch(); const all = [];
for (const scheme of ['light','dark']){
  const p = await b.newPage({ viewport:{ width:390, height:844 }, colorScheme: scheme });
  // any console error or page error (a missing icon logs one) fails the scan too
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|supabase/i.test(m.text())) all.push({ scheme, where:'console', text:m.text().slice(0,80), ratio:0, need:0, color:'', cls:'error' }); });
  p.on('pageerror', e => all.push({ scheme, where:'pageerror', text:e.message.slice(0,80), ratio:0, need:0, color:'', cls:'error' }));
  const scan = async (where) => { await p.waitForTimeout(450); const r = await p.evaluate(measure); r.forEach(x => all.push({ scheme, where, ...x })); };
  const tap = async (sel) => { const el = await p.$(sel); if (!el) return false; await el.click({ timeout: 4000 }).catch(e => console.error('tap failed', sel, e.message.split('\n')[0])); return true; };
  const close = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(250); };
  await p.goto(APP_URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('kudi.rem', JSON.stringify({meals:false,meds:false,vacc:false,trips:false,heat:false})); }); await p.reload(); await p.waitForTimeout(900);
  await tap('[data-a="obStart"]'); await scan('setup 1'); await p.fill('#obName','Bubu'); await tap('form[data-form="obPet"] button[type=submit]'); await scan('setup 2');
  await tap('form[data-form="obMeals"] button[type=submit]'); await scan('setup 3');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('kudi.rem', JSON.stringify({meals:false,meds:false,vacc:false,trips:false,heat:false})); }); await p.reload(); await p.waitForTimeout(800); await tap('[data-a="obSample"]'); await p.waitForTimeout(2900);
  await scan('today');
  for (const [tab, segs] of [['health',['meds','vaccines','heat','weight']],['food',['meals','pantry','guide']],['travel',[]],['me',[]]]){
    await tap(`.nav [data-tab="${tab}"]`); await scan(tab);
    for (const s of segs){ if (await tap(`[data-a="seg"][data-v="${s}"]`)) await scan(`${tab}/${s}`); }
  }
  await tap('.nav [data-tab="travel"]'); if (await tap('[data-a="openTrip"]')) await scan('trip');
  const sheets = [['health','med'],['health','vac'],['health','weight'],['food','meal'],['food','item'],['travel','trip'],['me','report'],['me','subscribe'],['me','pawmates']];
  for (const [tab, type] of sheets){ await tap('.nav [data-tab="'+tab+'"]'); await p.waitForTimeout(200); if (tab==='travel') await tap('[data-a="tripBack"]'); if (await tap(`[data-a="sheet"][data-type="${type}"]`)) { await scan(`sheet ${type}`); await close(); } }
  await tap('.nav [data-tab="me"]'); if (await tap('[data-a="openSettings"]')) await scan('settings page');
  await tap('.nav [data-tab="me"]'); if (await tap('[data-a="openReminders"]')) { await scan('reminders page'); if (await tap('[data-a="openCalendar"]')) await scan('calendar page'); }
  await p.close();
}
await b.close();
mkdirSync(new URL('../results/', import.meta.url), { recursive: true });
const lines = all.map(x => `${x.scheme.padEnd(5)} ${x.where.padEnd(16)} ${String(x.ratio).padStart(5)} < ${x.need}  "${x.text}"  ${x.color}  .${x.cls}`);
writeFileSync(new URL('../results/contrast.txt', import.meta.url), (lines.join('\n') || 'no contrast failures') + '\n');
console.log(lines.length ? lines.join('\n') : 'no contrast failures'); console.log(`\n${all.length} failures`);
process.exit(all.length ? 1 : 0);
