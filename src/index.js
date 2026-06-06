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

// ── HTTP server (Railway requires a bound port) ───────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Cymor Football Analyzer Bot',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// ── Bot ───────────────────────────────────────────────────────────────
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

  let pairingDone = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ── Pairing code: fires when socket is ready (qr event) ──────────
    if (qr && !pairingDone && !sock.authState.creds.registered) {
      pairingDone = true;
      console.log('\n📱 PAIRING MODE ACTIVE');
      console.log(`📞 Number: +${OWNER_NUMBER}`);
      console.log('⏳ Requesting pairing code...\n');

      try {
        const code = await sock.requestPairingCode(OWNER_NUMBER);

        console.log('╔══════════════════════════════════╗');
        console.log('║   🔑  YOUR PAIRING CODE:          ║');
        console.log('╠══════════════════════════════════╣');
        console.log(`║         ${code}           ║`);
        console.log('╚══════════════════════════════════╝');
        console.log('');
        console.log('📌 HOW TO LINK:');
        console.log('  1. Open WhatsApp');
        console.log('  2. Tap ⋮ → Linked Devices');
        console.log('  3. Link a Device');
        console.log('  4. "Link with phone number instead"');
        console.log(`  5. Enter: ${code}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (err) {
        console.error('❌ Pairing code failed:', err.message);
        pairingDone = false;
      }
    }

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');
    }

    if (connection === 'open') {
      console.log('');
      console.log('╔═══════════════════════════════════════╗');
      console.log('║   ✅  CYMOR BOT IS ONLINE!             ║');
      console.log('║   ⚽  Ready to analyze football!       ║');
      console.log('╚═══════════════════════════════════════╝');
      console.log('');
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`⚠️  Connection closed. Code: ${statusCode}`);

      if (!loggedOut) {
        console.log('🔄 Reconnecting in 5 seconds...');
        pairingDone = false;
        setTimeout(startCymor, 5000);
      } else {
        console.log('🚫 Logged out. Delete auth_info and redeploy.');
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

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
