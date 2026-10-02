// Local runner for the Blast Leftovers Telegram bot: long polling from this machine.
// The production bot runs on Vercel as a webhook (site/api/telegram.js); don't run both at once,
// Telegram refuses getUpdates while a webhook is set.
// Usage: npm run bot            (BOT_TOKEN and optional OWNER_ID in .env)
//        npm run bot:preview -- 0x... [uk]
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scan } from '../site/engine.js';
import { tg, setup, handleUpdate, hooks, report, chunks, buttons, EXAMPLE } from '../site/lib/bot-core.js';

function readEnv() {
  try {
    const txt = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env is optional when the variable is already set */ }
}
readEnv();

// ---------- preview without Telegram ----------
const PREVIEW = process.argv.indexOf('--preview');
if (PREVIEW >= 0) {
  const addr = process.argv[PREVIEW + 1] || EXAMPLE;
  const lang = process.argv[PREVIEW + 2] === 'uk' ? 'uk' : 'en';
  const r = await scan(addr, (m) => console.error('  ·', m));
  const parts = chunks(report(r, lang));
  parts.forEach((p, i) => console.log(`----- message ${i + 1}/${parts.length} (${p.length} chars) -----\n${p}`));
  console.log('----- buttons -----\n' + JSON.stringify(buttons(r, lang).inline_keyboard.map((row) => row.map((b) => b.text))));
  process.exit(0);
}

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is missing. Create a .env file in the project folder with: BOT_TOKEN=123456:ABC...');
  process.exit(1);
}

// ---------- stats (no addresses, no usernames: only a salted hash of the Telegram id) ----------
const OWNER_ID = Number(process.env.OWNER_ID || 0);
const STATS_FILE = new URL('./stats.json', import.meta.url);
const stats = (() => {
  try { return JSON.parse(readFileSync(STATS_FILE, 'utf8')); } catch { return { users: {}, scans: 0, scansWithFinds: 0, foundUsd: 0, shares: 0, started: Date.now() }; }
})();
const idHash = (id) => createHash('sha256').update('blast-leftovers:' + id).digest('hex').slice(0, 16);
let saveTimer = null;
function saveStats() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { const tmp = new URL('./stats.json.tmp', import.meta.url); writeFileSync(tmp, JSON.stringify(stats)); renameSync(tmp, STATS_FILE); } catch (e) { console.error('stats save failed:', e.message); }
  }, 1000);
}
const fmtUsd = (v) => '$' + (v || 0).toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2 });

hooks.onUser = (from) => {
  if (!from?.id) return;
  const h = idHash(from.id);
  const isNew = !stats.users[h];
  stats.users[h] = { first: stats.users[h]?.first || Date.now(), last: Date.now() };
  saveStats();
  if (isNew) {
    const n = Object.keys(stats.users).length;
    console.log(`[${new Date().toLocaleTimeString()}] new user #${n}`);
    if (OWNER_ID && from.id !== OWNER_ID) tg('sendMessage', { chat_id: OWNER_ID, text: `👤 New user #${n}` }).catch(() => {});
  }
};
hooks.onScan = (found, isExample) => {
  stats.scans++;
  if (found >= 1 && !isExample) { stats.scansWithFinds++; stats.foundUsd += found; }
  saveStats();
  console.log(`[${new Date().toLocaleTimeString()}] scan #${stats.scans}${isExample ? ' (example)' : found >= 1 ? ` found ${fmtUsd(found)}` : ''}`);
};
hooks.onShare = () => { stats.shares++; saveStats(); };
hooks.stats = () => {
  const users = Object.values(stats.users);
  const day = Date.now() - 86400000;
  return [
    '📊 <b>Bot stats</b> (local runner)',
    `Users: <b>${users.length}</b> (new in 24h: ${users.filter((u) => u.first > day).length}, active in 24h: ${users.filter((u) => u.last > day).length})`,
    `Scans: <b>${stats.scans}</b> (with something found: ${stats.scansWithFinds})`,
    `Found for people: <b>${fmtUsd(stats.foundUsd)}</b>`,
    `Share prompts shown: ${stats.shares}`,
  ].join('\n');
};

// ---------- long polling ----------
const me = await setup();
await tg('deleteWebhook', {}).catch(() => {}); // polling and webhook can't coexist
console.log(`Bot @${me.username} is running locally. Press Ctrl+C to stop.`);
console.log(`Users so far: ${Object.keys(stats.users).length}, scans: ${stats.scans}. Owner /stats: ${OWNER_ID ? 'on' : 'off'}`);
let offset = 0;
for (;;) {
  try {
    const updates = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
    for (const u of updates || []) {
      offset = u.update_id + 1;
      handleUpdate(u).catch((e) => console.error('update error:', e.message));
    }
  } catch (e) {
    console.error('polling error:', e.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
