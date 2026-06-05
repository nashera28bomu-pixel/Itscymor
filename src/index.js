import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { connectDB } from './utils/database.js';
import { startKeepAlive } from './utils/keepAlive.js';

const logger = pino({ level: 'silent' });
const OWNER_NUMBER = process.env.OWNER_NUMBER?.replace(/\D/g, ''); // strip + and spaces

async function startCymor() {
  console.log(`╔═══════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║           Starting Bot v1.0 🤖        ║
╚═══════════════╝`);

  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Chrome (Linux)', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
  });

  let pairingRequested = false; // prevent multiple requests

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');

      // Only request code once, and only if not registered
      if (!pairingRequested && !state.creds.registered && OWNER_NUMBER) {
        pairingRequested = true;
        try {
          await new Promise(r => setTimeout(r, 3000)); // wait for socket ready
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          console.log('\n🔑 YOUR PAIRING CODE:', code.match(/.{1,4}/g)?.join('-') || code);
          console.log('Enter this in WhatsApp > Linked Devices > Link with phone number\n');
        } catch (err) {
          console.error('❌ Pairing Error:', err.message);
        }
      }
    }

    if (connection === 'open') {
      console.log('\n✅ CYMOR BOT IS ONLINE!\n');
      startKeepAlive();
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        setTimeout(startCymor, 2000); // delay to avoid tight loop
      } else {
        console.log('🚫 Logged out. Delete auth_info and restart.');
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
