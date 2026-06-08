import 'dotenv/config';
import http from 'http';
import { Telegraf } from 'telegraf';
import { connectDB } from './utils/database.js';
import { commandRouter } from './handlers/commandRouter.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID || '';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in .env!');
  process.exit(1);
}

// ── HTTP server so Render doesn't kill the process ────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Cymor Football Analyzer Bot',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

console.log(`
╔═══════════════════════════════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║        Telegram Bot v2.0 🤖           ║
╚═══════════════════════════════════════╝
`);

await connectDB();

const bot = new Telegraf(BOT_TOKEN);

// ── Message handler ───────────────────────────────────────────────────
bot.on('text', async (teleCtx) => {
  const body = teleCtx.message.text;

  if (!body.startsWith('/') && !body.startsWith('.')) return;

  // Normalize / and . to dot commands
  const normalized = body.startsWith('/') ? '.' + body.slice(1) : body;

  const from = teleCtx.chat.id;
  const senderNumber = String(teleCtx.from.id);
  const isOwner = senderNumber === String(OWNER_ID);

  const ctx = {
    from,
    sender: senderNumber,
    senderNumber,
    body: normalized,
    isGroup: teleCtx.chat.type === 'group' || teleCtx.chat.type === 'supergroup',
    isOwner,
  };

  const sock = {
    sendMessage: async (chatId, { text }) => {
      try {
        await teleCtx.reply(text, { parse_mode: 'Markdown' });
      } catch {
        await teleCtx.reply(text);
      }
    },
  };

  console.log(`📩 [${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT] ${senderNumber}: ${body}`);

  try {
    await commandRouter(sock, teleCtx.message, ctx);
  } catch (err) {
    console.error('❌ Command error:', err.message);
    await teleCtx.reply('❌ Something went wrong 😅\nTry again or type /menu\n\n_Powered by Cymor 🤖_');
  }
});

// ── Set command menu in Telegram ──────────────────────────────────────
await bot.telegram.setMyCommands([
  { command: 'menu', description: '📋 Main menu' },
  { command: 'live', description: '🔴 Live scores now' },
  { command: 'today', description: '📅 Today\'s fixtures' },
  { command: 'tomorrow', description: '📅 Tomorrow\'s fixtures' },
  { command: 'weekend', description: '🗓️ Weekend fixtures' },
  { command: 'predict', description: '🔮 Predict a match' },
  { command: 'picks', description: '🔥 Best bets today' },
  { command: 'odds', description: '💰 Compare bookmaker odds' },
  { command: 'h2h', description: '⚔️ Head to head stats' },
  { command: 'form', description: '📊 Team recent form' },
  { command: 'table', description: '🏆 League standings' },
  { command: 'news', description: '📰 Latest football news' },
  { command: 'leagues', description: '🌍 Supported leagues' },
  { command: 'ping', description: '🏓 Check bot status' },
]);

// ── Launch with dropPendingUpdates to fix 409 conflict ────────────────
await bot.launch({
  dropPendingUpdates: true,
  allowedUpdates: ['message'],
});

console.log('✅ CYMOR BOT IS ONLINE ON TELEGRAM!');
console.log('⚽ Ready to analyze football!\n');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
