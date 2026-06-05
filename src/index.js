import 'dotenv/config';
import http from 'http';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { connectDB } from './utils/database.js';
import { startKeepAlive } from './utils/keepAlive.js';

const logger = pino({ level: 'silent' });
const OWNER_NUMBER = process.env.OWNER_NUMBER?.replace(/\D/g, ''); // strip + and spaces
const PORT = process.env.PORT || 3000;

// Render needs an open port within 60s or it restarts the service
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cymor Bot Running');
}).listen(PORT, () => console.log(`🌐 Health server listening on ${PORT}`));

let sock;
let reconnecting = false;

async function startCymor() {
  if (reconnecting) return;
  reconnecting = true;

  console.log(`╔═══════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║           Starting Bot v1.0 🤖        ║
╚═══════════════╝`);

  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  let pairingRequested = false;

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Chrome (Linux)', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');

      // Request pairing code only once per session
      if (!pairingRequested && !state.creds.registered && OWNER_NUMBER) {
        pairingRequested = true;
        try {
          await new Promise(r => setTimeout(r, 3000));
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log(`\n🔑 YOUR PAIRING CODE: ${formatted}`);
          console.log('Go to WhatsApp > Linked Devices > Link with phone number and enter it within 30s\n');
        } catch (err) {
          console.error('❌ Pairing Error:', err.message);
        }
      }
    }

    if (connection === 'open') {
      console.log('\n✅ CYMOR BOT IS ONLINE!\n');
      reconnecting = false;
      startKeepAlive();
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.badSession;

      if (shouldReconnect) {
        console.log('🔄 Connection closed, reconnecting in 3s...');
        setTimeout(() => {
          reconnecting = false;
          startCymor();
        }, 3000);
      } else {
        console.log('🚫 Logged out. Delete auth_info folder and restart.');
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

startCymor().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
