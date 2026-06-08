import { menuCommand } from '../commands/menu.js';
import { liveCommand } from '../commands/live.js';
import { todayCommand, tomorrowCommand, weekendCommand } from '../commands/fixtures.js';
import { predictCommand } from '../commands/predict.js';
import { picksCommand } from '../commands/picks.js';
import { oddsCommand } from '../commands/odds.js';
import { h2hCommand } from '../commands/h2h.js';
import { formCommand } from '../commands/form.js';
import { tableCommand } from '../commands/table.js';
import { newsCommand } from '../commands/news.js';
import { pingCommand } from '../commands/ping.js';
import { leaguesCommand } from '../commands/leagues.js';
import { ownerCommands } from '../commands/owner.js';

export async function commandRouter(sock, msg, ctx) {
  const { body, from, isOwner } = ctx;
  const args = body.trim().split(' ');
  const command = args[0].toLowerCase();
  const params = args.slice(1).join(' ');

  switch (command) {
    // ── Main Menu ─────────────────────────────────────────────────
    case '.menu':
    case '.cymor':
    case '.start':
    case '.help':
      return menuCommand(sock, msg, ctx);

    // ── Live & Fixtures ───────────────────────────────────────────
    case '.live':
      return liveCommand(sock, msg, ctx);

    case '.today':
      return todayCommand(sock, msg, ctx);

    case '.tomorrow':
      return tomorrowCommand(sock, msg, ctx);

    case '.weekend':
      return weekendCommand(sock, msg, ctx);

    // ── Predictions ───────────────────────────────────────────────
    case '.predict':
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* /predict [Team A] vs [Team B]\n\n*Example:*\n/predict Arsenal vs Chelsea\n\n_Powered by Cymor 🤖_`,
        });
      }
      return predictCommand(sock, msg, ctx, params);

    case '.picks':
      return picksCommand(sock, msg, ctx);

    // ── Stats & Odds ──────────────────────────────────────────────
    case '.odds':
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* /odds [Team A] vs [Team B]\n\n*Example:*\n/odds Man City vs Arsenal\n\n_Powered by Cymor 🤖_`,
        });
      }
      return oddsCommand(sock, msg, ctx, params);

    case '.h2h':
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* /h2h [Team A] vs [Team B]\n\n*Example:*\n/h2h Real Madrid vs Barcelona\n\n_Powered by Cymor 🤖_`,
        });
      }
      return h2hCommand(sock, msg, ctx, params);

    case '.form':
      if (!params) {
        return sock.sendMessage(from, {
          text: `❌ *Usage:* /form [Team Name]\n\n*Example:*\n/form Liverpool\n\n_Powered by Cymor 🤖_`,
        });
      }
      return formCommand(sock, msg, ctx, params);

    case '.table':
    case '.standings':
      return tableCommand(sock, msg, ctx, params);

    case '.news':
      return newsCommand(sock, msg, ctx, params);

    // ── Utility ───────────────────────────────────────────────────
    case '.ping':
      return pingCommand(sock, msg, ctx);

    case '.leagues':
      return leaguesCommand(sock, msg, ctx);

    case '.timezone':
      return sock.sendMessage(from, {
        text: `🕐 *CYMOR TIMEZONE INFO*\n━━━━━━━━━━━━━━━━━━━━━━\n\n✅ All match times displayed in:\n*EAT — East Africa Time (UTC+3)*\n\nThis covers:\n🇰🇪 Kenya | 🇹🇿 Tanzania\n🇺🇬 Uganda | 🇪🇹 Ethiopia\n🇸🇴 Somalia | 🇷🇼 Rwanda\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Powered by Cymor 🤖_`,
      });

    // ── Owner Commands ────────────────────────────────────────────
    case '.broadcast':
    case '.ban':
    case '.unban':
    case '.botstats':
    case '.restart':
    case '.shutdown':
      if (!isOwner) {
        return sock.sendMessage(from, {
          text: `🚫 *Access Denied!*\n\nHii command ni ya owner tu bana! 😏\n\n_Powered by Cymor 🤖_`,
        });
      }
      return ownerCommands(sock, msg, ctx, command, params);

    // ── Unknown ───────────────────────────────────────────────────
    default:
      return sock.sendMessage(from, {
        text: `❓ *Unknown command:* ${command}\n\nType /menu to see all available commands 📋\n\n_Powered by Cymor 🤖_`,
      });
  }
}
