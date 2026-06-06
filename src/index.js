import 'dotenv/config';
import http from 'http';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { connectDB } from './utils/database.js';

const logger = pino({ level: 'silent' });
const OWNER_NUMBER = process.env.OWNER_NUMBER || '254113821327';
const PORT = process.env.PORT || 3000;

// ── HTTP server MUST start first so Render doesn't kill the process ──
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Cymor Football Analyzer Bot',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
  }));
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// ── Keep-alive self ping every 14 mins ───────────────────────────────
if (process.env.RENDER_URL) {
  setInterval(() => {
    http.get(process.env.RENDER_URL, (res) => {
      console.log(`🏓 Self-ping OK — ${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT`);
    }).on('error', () => {});
  }, 14 * 60 * 1000);
}

// ── Main bot function ─────────────────────────────────────────────────
async function startCymor() {
  console.log(`
╔═══════════════════════════════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║           Starting Bot v1.0 🤖        ║
╚═══════════════════════════════════════╝
  `);

  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Cymor Bot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  let pairingRequested = false;

  // ── Connection Updates ──────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, isNewLogin } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');

      // Request pairing code once, only when not yet registered
      if (!pairingRequested && !sock.authState.creds.registered) {
        pairingRequested = true;
        console.log('\n📱 PAIRING MODE ACTIVE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📞 Requesting pairing code for: +${OWNER_NUMBER}`);

        // Wait 5s for the socket to be ready enough to accept the request
        await new Promise(r => setTimeout(r, 5000));

        try {
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          console.log('\n╔══════════════════════════════════╗');
          console.log('║   🔑  YOUR PAIRING CODE IS:       ║');
          console.log('╠══════════════════════════════════╣');
          console.log(`║          ${code}            ║`);
          console.log('╚══════════════════════════════════╝');
          console.log('\n📌 HOW TO LINK:');
          console.log('  1. Open WhatsApp on your phone');
          console.log('  2. Tap ⋮ (3 dots) → Linked Devices');
          console.log('  3. Tap "Link a Device"');
          console.log('  4. Tap "Link with phone number instead"');
          console.log(`  5. Enter code: ${code}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } catch (err) {
          console.error('❌ Pairing code error:', err.message);
          pairingRequested = false; // allow retry on next reconnect
        }
      }
    }

    if (connection === 'open') {
      console.log('\n╔═══════════════════════════════════════╗');
      console.log('║   ✅  CYMOR BOT IS ONLINE!             ║');
      console.log('║   ⚽  Ready to analyze football!       ║');
      console.log('╚═══════════════════════════════════════╝\n');
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log(`\n⚠️  Connection closed. Code: ${code}`);

      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 5 seconds...\n');
        pairingRequested = false;
        setTimeout(startCymor, 5000);
      } else {
        console.log('🚫 Logged out. Delete the auth_info folder on Render and redeploy.\n');
        process.exit(1);
      }
    }
  });

  // ── Save credentials ────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Incoming messages ───────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant : from;
      const senderNumber = sender?.replace('@s.whatsapp.net', '');

      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!body.startsWith('.')) continue;

      console.log(`📩 [${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT] ${senderNumber}: ${body}`);

      try {
        await commandRouter(sock, msg, {
          from,
          sender,
          senderNumber,
          body,
          isGroup,
          isOwner: senderNumber === OWNER_NUMBER,
        });
      } catch (err) {
        console.error('❌ Command error:', err.message);
        await sock.sendMessage(from, {
          text: `❌ *Error!*\n\nSomething went wrong bana 😅\nTry again or type *.help*\n\n_Powered by Cymor 🤖_`,
        });
      }
    }
  });
}

startCymor().catch(console.error);
