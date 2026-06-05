import 'dotenv/config';
import http from 'http';
import { makeWASocket, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { connectDB } from './utils/database.js';
import { startKeepAlive } from './utils/keepAlive.js';
// Import your custom mongo auth provider
import { useMongoDBAuthState } from './utils/mongoAuth.js'; 

const logger = pino({ level: 'silent' });
const OWNER_NUMBER = process.env.OWNER_NUMBER?.replace(/\D/g, ''); 
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cymor Bot Running');
}).listen(PORT, () => console.log(`🌐 Health server listening on ${PORT}`));

let sock;

async function startCymor() {
  console.log(`╔═══════════════╗
║      ⚽  CYMOR FOOTBALL ANALYZER      ║
║           Starting Bot v1.0 🤖        ║
╚═══════════════╝`);

  await connectDB();

  // Use MongoDB instead of local files
  const { state, saveCreds } = await useMongoDBAuthState();

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Ubuntu', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  // Pairing logic moved to a cleaner check
  if (!state.creds.registered && OWNER_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(OWNER_NUMBER);
        console.log(`\n🔑 PAIRING CODE: ${code?.match(/.{1,4}/g)?.join('-')}\n`);
      } catch (err) {
        console.error('❌ Pairing Error:', err.message);
      }
    }, 5000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('\n✅ CYMOR BOT IS ONLINE!\n');
      startKeepAlive();
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Connection closed, reconnecting...');
        startCymor();
      } else {
        console.log('🚫 Logged out. Clear your MongoDB collection and restart.');
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
