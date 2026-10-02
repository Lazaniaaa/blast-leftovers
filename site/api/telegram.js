// Vercel webhook for the Blast Leftovers Telegram bot.
// Telegram POSTs updates here; we answer 200 at once and keep scanning in the background (waitUntil),
// so Telegram never retries while a slow wallet is being scanned.
import { waitUntil } from '@vercel/functions';
import { handleUpdate, hooks, tg } from '../lib/bot-core.js';

export const config = { maxDuration: 300 };

const ownerId = () => Number(process.env.OWNER_ID || 0);
const fmtUsd = (v) => '$' + (v || 0).toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2 });

// No disk on the server: report to the owner in Telegram and to the Vercel logs instead of a stats file.
hooks.onUser = (from, lang, text) => {
  if (/^\/start\b/.test(text || '')) {
    console.log('event: start');
    if (ownerId() && from?.id !== ownerId()) tg('sendMessage', { chat_id: ownerId(), text: '👤 Someone pressed /start' }).catch(() => {});
  }
};
hooks.onScan = (found, isExample) => {
  console.log(`event: scan${isExample ? ' (example)' : found >= 1 ? ` found ${fmtUsd(found)}` : ''}`);
  if (ownerId() && !isExample && found >= 20) tg('sendMessage', { chat_id: ownerId(), text: `💰 Someone found ${fmtUsd(found)} on Blast` }).catch(() => {});
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(401).send('unauthorized');
  const update = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  waitUntil(handleUpdate(update).catch((e) => console.error('update error:', e.message)));
  return res.status(200).send('ok');
}
