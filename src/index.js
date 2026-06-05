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

  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    // Using a more standard desktop browser identity to improve connection stability
    browser: ['Chrome', 'Windows', '114.0.5735.198'], 
    generateHighQualityLinkPreview: true,
  });

  // ── Connection Updates ────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');
      
      // Request pairing code only when connecting and not registered
      if (!sock.authState.creds.registered) {
        try {
          // Small delay to ensure socket is ready
          await new Promise(resolve => setTimeout(resolve, 2000));
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          
          console.log('\n╔══════════════════════════════╗');
          console.log('║   🔑  YOUR PAIRING CODE      ║');
          console.log('╠══════════════════════════════╣');
          console.log(`║        ${code}        ║`);
          console.log('╚══════════════════════════════╝');
          console.log('\n📌 Steps:');
          console.log('  1. Open WhatsApp > Linked Devices > Link a Device');
          console.log('  2. Tap "Link with phone number instead"');
          console.log(`  3. Enter: ${code}\n`);
        } catch (err) {
          console.error('❌ Failed to get pairing code:', err.message);
        }
      }
    }

    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
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
      console.log('╚═══════════════════════════════════════╝\n');
      startKeepAlive();
    }
  });

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

      const body = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption || '';

      if (!body.startsWith('.')) continue;

      try {
        await commandRouter(sock, msg, {
          from, sender, senderNumber, body, isGroup,
          isOwner: senderNumber === OWNER_NUMBER,
        });
      } catch (err) {
        console.error('❌ Command error:', err.message);
      }
    }
  });

  return sock;
}

startCymor().catch(console.error);
