import { findMatchOdds, formatOdds } from '../services/oddsAPI.js';
import { getEATTime } from '../utils/time.js';

export async function oddsCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  const vsRegex = /(.+?)\s+vs\s+(.+)/i;
  const match = params.match(vsRegex);
  if (!match) {
    return sock.sendMessage(from, {
      text: `❌ *Usage:* .odds [Team A] vs [Team B]\n\nExample:\n.odds Arsenal vs Chelsea\n\n_Powered by Cymor 🤖_`,
    });
  }

  const team1 = match[1].trim();
  const team2 = match[2].trim();

  await sock.sendMessage(from, {
    text: `🔍 _Fetching odds for ${team1} vs ${team2}..._`,
  });

  try {
    const oddsData = await findMatchOdds(team1, team2);

    if (!oddsData) {
      return sock.sendMessage(from, {
        text: `❌ *No odds found*\n\nOdds for *${team1} vs ${team2}* hazipo bana 😅\n\nThis match may not be listed yet.\nTry again closer to kickoff!\n\n_Powered by Cymor 🤖_`,
      });
    }

    const formatted = formatOdds(oddsData);

    if (!formatted || Object.keys(formatted).length === 0) {
      return sock.sendMessage(from, {
        text: `❌ Odds data unavailable for this match.\n\n_Powered by Cymor 🤖_`,
      });
    }

    // Find best odds for each outcome
    let bestHome = { bm: '', odds: 0 };
    let bestDraw = { bm: '', odds: 0 };
    let bestAway = { bm: '', odds: 0 };

    for (const [bm, odds] of Object.entries(formatted)) {
      if (parseFloat(odds.home) > bestHome.odds) {
        bestHome = { bm, odds: parseFloat(odds.home) };
      }
      if (parseFloat(odds.draw) > bestDraw.odds) {
        bestDraw = { bm, odds: parseFloat(odds.draw) };
      }
      if (parseFloat(odds.away) > bestAway.odds) {
        bestAway = { bm, odds: parseFloat(odds.away) };
      }
    }

    let text = `💰 *ODDS — CYMOR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚽ *${oddsData.home_team}* vs *${oddsData.away_team}*\n`;
    text += `🕐 ${getEATTime()} EAT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📊 *BOOKMAKER COMPARISON*\n\n`;
    text += `${'Bookmaker'.padEnd(20)} 🏠 Home  🤝 Draw  ✈️ Away\n`;
    text += `${'─'.repeat(46)}\n`;

    for (const [bm, odds] of Object.entries(formatted)) {
      const name = bm.replace(/[🇰🇪🌍]/g, '').trim().padEnd(20);
      text += `${name} ${String(odds.home).padEnd(7)} ${String(odds.draw).padEnd(7)} ${odds.away}\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏆 *BEST ODDS*\n`;
    text += `🏠 Home Win: *${bestHome.odds}* — ${bestHome.bm}\n`;
    text += `🤝 Draw: *${bestDraw.odds}* — ${bestDraw.bm}\n`;
    text += `✈️ Away Win: *${bestAway.odds}* — ${bestAway.bm}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 Type *.predict ${team1} vs ${team2}*\nfor full AI analysis\n`;
    text += `⚠️ Bet Responsibly! 18+\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Odds command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching odds. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
