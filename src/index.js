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
    // Canonical browser identity to bypass handshake rejections
    browser: ['Chrome (Linux)', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');
    }

    if (connection === 'open') {
      console.log('\n✅ CYMOR BOT IS ONLINE!\n');
      startKeepAlive();
    }

    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        startCymor();
      } else {
        console.log('🚫 Logged out. Delete auth_info and restart.');
        process.exit(1);
      }
    }

    // Handle pairing logic after connection reaches 'connecting' state
    if (connection === 'connecting' && !sock.authState.creds.registered) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          console.log('\n🔑 YOUR PAIRING CODE:', code);
        } catch (err) {
          console.error('❌ Pairing Error:', err.message);
        }
      }, 5000); // 5-second delay to ensure socket stability
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
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      if (!body.startsWith('.')) continue;

      try {
        await commandRouter(sock, msg, { from, sender, senderNumber, body, isGroup, isOwner: senderNumber === OWNER_NUMBER });
      } catch (err) {
        console.error('❌ Command Error:', err.message);
      }
    }
  });
}

startCymor().catch(console.error);
