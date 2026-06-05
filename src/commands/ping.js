import { getEATTime, getEATDate } from '../utils/time.js';

export async function pingCommand(sock, msg, ctx) {
  const { from } = ctx;
  const start = Date.now();

  await sock.sendMessage(from, { text: `🏓 _Pinging..._` });

  const latency = Date.now() - start;
  const uptime = process.uptime();
  const uptimeStr = formatUptime(uptime);

  const mem = process.memoryUsage();
  const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);

  const text = `🤖 *CYMOR BOT STATUS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n✅ *Status:* Online & Ready!\n⚡ *Latency:* ${latency}ms\n⏱️ *Uptime:* ${uptimeStr}\n💾 *Memory:* ${memMB} MB\n🕐 *Time:* ${getEATTime()} EAT\n📅 *Date:* ${getEATDate()}\n🌍 *Timezone:* EAT (UTC+3)\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Powered by Cymor 🤖 v1.0_`;

  await sock.sendMessage(from, { text });
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
}
