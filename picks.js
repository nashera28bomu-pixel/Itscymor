import { getFixturesByDate } from '../services/footballAPI.js';
import { getAllOdds } from '../services/oddsAPI.js';
import { getDailyPicks } from '../services/aiPredictor.js';
import { getAPIDate, getEATDate, getEATTime, utcToEATTime } from '../utils/time.js';

export async function picksCommand(sock, msg, ctx) {
  const { from } = ctx;

  await sock.sendMessage(from, {
    text: `🔥 _Cymor is analyzing today's matches...\nThis may take a moment ⏳_`,
  });

  try {
    const date = getAPIDate(0);
    const [fixturesData, oddsData] = await Promise.all([
      getFixturesByDate(date),
      getAllOdds(),
    ]);

    const fixtures = fixturesData?.response || [];

    if (fixtures.length === 0) {
      return sock.sendMessage(from, {
        text: `😅 *No matches today!*\n\nHapana games leo bana.\nTry *.tomorrow* or *.weekend*\n\n_Powered by Cymor 🤖_`,
      });
    }

    // Prepare match data for AI
    const matchesForAI = fixtures.slice(0, 15).map((fix) => ({
      home: fix.teams.home.name,
      away: fix.teams.away.name,
      league: fix.league.name,
      country: fix.league.country,
      kickoff: utcToEATTime(fix.fixture.timestamp) + ' EAT',
      fixtureId: fix.fixture.id,
    }));

    // Attach odds where available
    if (oddsData) {
      for (const match of matchesForAI) {
        const found = oddsData.find((o) => {
          const h = o.home_team?.toLowerCase();
          const a = o.away_team?.toLowerCase();
          return (
            h?.includes(match.home.toLowerCase().split(' ')[0]) ||
            a?.includes(match.away.toLowerCase().split(' ')[0])
          );
        });
        if (found?.bookmakers?.[0]?.markets?.[0]) {
          const outcomes = found.bookmakers[0].markets[0].outcomes;
          match.odds = {
            home: outcomes.find((o) => o.name === found.home_team)?.price,
            draw: outcomes.find((o) => o.name === 'Draw')?.price,
            away: outcomes.find((o) => o.name === found.away_team)?.price,
          };
        }
      }
    }

    const picks = await getDailyPicks(matchesForAI);

    if (!picks || !picks.picks) {
      return sock.sendMessage(from, {
        text: `❌ *AI Picks failed*\n\nClaude haikujibu bana 😅\nTry again later.\n\n_Powered by Cymor 🤖_`,
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const confEmoji = { LOW: '🔴', MEDIUM: '🟡', HIGH: '🟢', 'VERY HIGH': '💚' };

    let text = `🔥 *CYMOR BEST PICKS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 ${getEATDate()}\n`;
    text += `🕐 Updated: ${getEATTime()} EAT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (let i = 0; i < picks.picks.length; i++) {
      const pick = picks.picks[i];
      const medal = medals[i] || `#${i + 1}`;
      const conf = confEmoji[pick.confidence] || '⚪';

      text += `${medal} *PICK ${i + 1}* — ${conf} ${pick.confidence}\n`;
      text += `⚽ *${pick.match}*\n`;
      text += `🏆 ${pick.competition}\n`;
      text += `🕐 ${pick.kickoff}\n`;
      text += `✅ *${pick.recommendation}*\n`;
      text += `💰 Odds: *${pick.odds}* (${pick.bookmaker})\n`;
      text += `💡 ${pick.reasoning}\n`;
      text += `\n`;
    }

    if (picks.accumulator) {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🎰 *ACCUMULATOR*\n`;
      text += `Combined Odds: *${picks.accumulator.totalOdds}x*\n`;
      text += `💬 ${picks.accumulator.advice}\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ ${picks.disclaimer || 'Bet Responsibly! 18+'}\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Picks command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching picks. Try again bana! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
