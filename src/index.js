import 'dotenv/config';
import http from 'http';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { commandRouter } from './handlers/commandRouter.js';
import { startKeepAlive } from './utils/keepAlive.js';

const logger = pino({ level: 'silent' });
const OWNER_NUMBER = process.env.OWNER_NUMBER?.replace(/\D/g, '');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cymor Bot Running');
}).listen(PORT, () => console.log(`🌐 Health server listening on ${PORT}`));

async function startCymor() {
  console.log(`\n⚽ CYMOR FOOTBALL ANALYZER - Starting...\n`);

  // This creates a local folder. Since Render wipes this, it effectively resets every time.
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_temp');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    browser: ['Ubuntu', 'Chrome', '124.0.0.0'],
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') console.log('🔌 Connecting...');

    if (connection === 'open') {
      console.log('✅ BOT IS ONLINE!');
      startKeepAlive();
    }

    if (connection === 'close') {
      // If we closed, just restart the process to reset everything
      console.log('🔄 Connection closed. Restarting...');
      process.exit(1); 
    }
  });

  // Pairing code trigger
  setTimeout(async () => {
    if (!sock.authState.creds.registered && OWNER_NUMBER) {
      try {
        const code = await sock.requestPairingCode(OWNER_NUMBER);
        console.log(`\n🔑 PAIRING CODE: ${code?.match(/.{1,4}/g)?.join('-')}\n`);
      } catch (err) {
        console.error('Pairing Error:', err.message);
      }
    }
  }, 5000);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!body.startsWith('.')) continue;
      
      await commandRouter(sock, msg, { body });
    }
  });
}

startCymor();
