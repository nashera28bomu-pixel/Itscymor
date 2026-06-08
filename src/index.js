import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { connectDB } from './utils/database.js';
import { commandRouter } from './handlers/commandRouter.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID || '';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in .env!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

console.log(`
╔═══════════════════════════════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║        Telegram Bot v2.0 🤖           ║
╚═══════════════════════════════════════╝
`);

await connectDB();

// ── Message handler ───────────────────────────────────────────────────
bot.on('text', async (teleCtx) => {
  const body = teleCtx.message.text;

  // Only handle dot commands
  if (!body.startsWith('/') && !body.startsWith('.')) return;

  // Normalize: treat / and . the same
  const normalized = body.startsWith('/') ? '.' + body.slice(1) : body;

  const from = teleCtx.chat.id;
  const senderNumber = String(teleCtx.from.id);
  const isOwner = senderNumber === String(OWNER_ID);

  // Build a ctx compatible with existing commands
  const ctx = {
    from,
    sender: senderNumber,
    senderNumber,
    body: normalized,
    isGroup: teleCtx.chat.type === 'group' || teleCtx.chat.type === 'supergroup',
    isOwner,
  };

  // Build a sock-compatible wrapper so commands work unchanged
  const sock = {
    sendMessage: async (chatId, { text }) => {
      try {
        await teleCtx.reply(text, { parse_mode: 'Markdown' });
      } catch {
        // Fallback without markdown if parse fails
        await teleCtx.reply(text);
      }
    },
  };

  const args = normalized.trim().split(' ');
  const command = args[0].toLowerCase();

  console.log(`📩 [${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT] ${senderNumber}: ${body}`);

  try {
    await commandRouter(sock, teleCtx.message, ctx);
  } catch (err) {
    console.error('❌ Command error:', err.message);
    await teleCtx.reply('❌ *Error!*\n\nSomething went wrong 😅\nTry again or type /help\n\n_Powered by Cymor 🤖_');
  }
});

// ── Bot commands menu (shows in Telegram command picker) ──────────────
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

// ── Launch ────────────────────────────────────────────────────────────
bot.launch({
  dropPendingUpdates: true,
});

console.log('✅ CYMOR BOT IS ONLINE ON TELEGRAM!');
console.log('⚽ Ready to analyze football!\n');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
