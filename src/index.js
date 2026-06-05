import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { connectDB } from './utils/database.js';
import { startKeepAlive } from './utils/keepAlive.js';

const logger = pino({ level: 'silent' });

const OWNER_NUMBER = process.env.OWNER_NUMBER || '254113821327';

async function startCymor() {
  console.log(`
╔═══════════════════════════════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║           Starting Bot v1.0 🤖        ║
╚═══════════════════════════════════════╝
  `);

  // Connect to MongoDB
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

  // ── Pairing Code (shown in logs) ──────────────────────────────
  if (!sock.authState.creds.registered) {
    console.log('\n📱 PAIRING MODE ACTIVE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📞 Requesting pairing code for: +${OWNER_NUMBER}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(OWNER_NUMBER);
        console.log('\n╔══════════════════════════════╗');
        console.log('║   🔑  YOUR PAIRING CODE      ║');
        console.log('╠══════════════════════════════╣');
        console.log(`║        ${code}        ║`);
        console.log('╚══════════════════════════════╝');
        console.log('\n📌 Steps:');
        console.log('  1. Open WhatsApp on your phone');
        console.log('  2. Tap ⋮ Menu → Linked Devices');
        console.log('  3. Tap "Link a Device"');
        console.log('  4. Tap "Link with phone number instead"');
        console.log(`  5. Enter the code above: ${code}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (err) {
        console.error('❌ Failed to get pairing code:', err.message);
      }
    }, 3000);
  }

  // ── Connection Updates ────────────────────────────────────────
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log('\n⚠️  Connection closed.');
      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 5 seconds...\n');
        setTimeout(startCymor, 5000);
      } else {
        console.log('🚫 Logged out. Delete auth_info folder and restart.\n');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      console.log('\n╔═══════════════════════════════════════╗');
      console.log('║   ✅  CYMOR BOT IS ONLINE!             ║');
      console.log('║   ⚽  Ready to analyze football!       ║');
      console.log('╚═══════════════════════════════════════╝\n');
      startKeepAlive();
    }

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');
    }
  });

  // ── Save Credentials ─────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Incoming Messages ─────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant : from;
      const senderNumber = sender?.replace('@s.whatsapp.net', '');

      // Get message text
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

  return sock;
}

startCymor().catch(console.error);
