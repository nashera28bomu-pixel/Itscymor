import { getEATTime, getEATDate } from '../utils/time.js';

// ── News Command ──────────────────────────────────────────────────
export async function newsCommand(sock, msg, ctx, params) {
  const { from } = ctx;
  const team = params || 'football';

  await sock.sendMessage(from, {
    text: `🔍 _Fetching latest news for ${team}..._`,
  });

  // Note: Real implementation would use a news API
  // For now, we point users to good sources
  const text = `📰 *FOOTBALL NEWS — CYMOR*\n━━━━━━━━━━━━━━━━━━━━━━\n\n🔍 Search: *${team}*\n🕐 ${getEATTime()} EAT\n\n━━━━━━━━━━━━━━━━━━━━━━\n📡 *TOP SOURCES:*\n\n🌍 *BBC Sport Africa*\nbbc.com/sport/africa\n\n⚽ *Goal.com*\ngoal.com\n\n🇰🇪 *SuperSport Kenya*\nsupersport.com/football/kenya\n\n📱 *Flash Scores*\nflashscore.com\n\n🔴 *Sky Sports*\nskysports.com/football\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Full news integration coming soon!\n\n_Powered by Cymor 🤖_`;

  await sock.sendMessage(from, { text });
}
