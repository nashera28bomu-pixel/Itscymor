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

// Render Web Service needs an open port or it kills the instance
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
    connectTimeoutMs: 90000,        // Render is slow, give it 90s
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 1000,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      console.log('🔌 Connecting to WhatsApp...');

      // Only request code once, and wait longer for Render cold start
      if (!pairingRequested && !state.creds.registered && OWNER_NUMBER) {
        pairingRequested = true;
        try {
          await new Promise(r => setTimeout(r, 8000)); // 8s delay
          const code = await sock.requestPairingCode(OWNER_NUMBER);
          const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log(`\n🔑 YOUR PAIRING CODE: ${formatted}`);
          console.log('Enter this NOW in WhatsApp > Linked Devices > Link with phone number. Expires in 30s\n');
        } catch (err) {
          console.error('❌ Pairing Error:', err.message);
          pairingRequested = false; // allow retry on next connect
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

      // If we were pairing, wait longer before reconnect to avoid killing it mid-code
      const delay = pairingRequested ? 10000 : 3000;
      
      if (shouldReconnect) {
        console.log(`🔄 Connection closed, reconnecting in ${delay/1000}s...`);
        setTimeout(() => {
          reconnecting = false;
          pairingRequested = false;
          startCymor();
        }, delay);
      } else {
        console.log('🚫 Logged out. Delete auth_info folder on Render and restart.');
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
