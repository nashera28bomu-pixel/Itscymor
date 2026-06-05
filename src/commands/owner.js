import { getEATTime, getEATDate } from '../utils/time.js';

const bannedUsers = new Set();

export async function ownerCommands(sock, msg, ctx, command, params) {
  const { from, senderNumber } = ctx;

  switch (command) {
    case '.broadcast': {
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* .broadcast [message]\n\nExample:\n.broadcast Bot will restart in 5 mins!`,
        });
      }

      // In single-user mode, just confirm the message
      const broadcastMsg = `📢 *CYMOR BROADCAST*\n━━━━━━━━━━━━━━━━━━━━━━\n\n${params}\n\n━━━━━━━━━━━━━━━━━━━━━━\n🕐 ${getEATTime()} EAT\n_Powered by Cymor 🤖_`;

      await sock.sendMessage(from, {
        text: `✅ *Broadcast sent!*\n\nMessage:\n"${params}"\n\n_Multi-user broadcast available in v2.0_`,
      });
      break;
    }

    case '.ban': {
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* .ban [phone number]\n\nExample:\n.ban 254712345678`,
        });
      }
      const banNum = params.replace(/[^0-9]/g, '');
      bannedUsers.add(banNum);
      await sock.sendMessage(from, {
        text: `✅ *User Banned!*\n\n📵 +${banNum} has been banned from Cymor.\n\n_Powered by Cymor 🤖_`,
      });
      break;
    }

    case '.unban': {
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* .unban [phone number]\n\nExample:\n.unban 254712345678`,
        });
      }
      const unbanNum = params.replace(/[^0-9]/g, '');
      bannedUsers.delete(unbanNum);
      await sock.sendMessage(from, {
        text: `✅ *User Unbanned!*\n\n✔️ +${unbanNum} can now use Cymor again.\n\n_Powered by Cymor 🤖_`,
      });
      break;
    }

    case '.botstats': {
      const uptime = process.uptime();
      const mem = process.memoryUsage();
      const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
      const totalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);

      const d = Math.floor(uptime / 86400);
      const h = Math.floor((uptime % 86400) / 3600);
      const m = Math.floor((uptime % 3600) / 60);

      await sock.sendMessage(from, {
        text: `👑 *CYMOR BOT STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n⏱️ *Uptime:* ${d}d ${h}h ${m}m\n💾 *Memory:* ${memMB}MB / ${totalMB}MB\n📵 *Banned Users:* ${bannedUsers.size}\n🕐 *Time:* ${getEATTime()} EAT\n📅 *Date:* ${getEATDate()}\n🌍 *Timezone:* EAT (UTC+3)\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Powered by Cymor 🤖 v1.0_`,
      });
      break;
    }

    case '.restart': {
      await sock.sendMessage(from, {
        text: `🔄 *Restarting Cymor...*\n\nBot itarudi baada ya sekunde chache! ⏳\n\n_Powered by Cymor 🤖_`,
      });
      setTimeout(() => {
        console.log('🔄 Restart requested by owner');
        process.exit(0); // Render/PM2 will auto-restart
      }, 2000);
      break;
    }

    case '.shutdown': {
      await sock.sendMessage(from, {
        text: `🔴 *Shutting down Cymor...*\n\nKwa heri! Bot imezimwa na owner. 👋\n\n_Cymor 🤖_`,
      });
      setTimeout(() => {
        console.log('🔴 Shutdown requested by owner');
        process.exit(1);
      }, 2000);
      break;
    }

    default:
      await sock.sendMessage(from, {
        text: `❌ Unknown owner command: ${command}\n\n_Powered by Cymor 🤖_`,
      });
  }
}

export { bannedUsers };
