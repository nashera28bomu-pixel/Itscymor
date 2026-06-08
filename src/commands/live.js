import { getLiveFixtures } from '../services/footballAPI.js';
import { getEATTime, utcToEATTime, getStatusEmoji, getLeagueEmoji } from '../utils/time.js';

export async function liveCommand(sock, msg, ctx) {
  const { from } = ctx;

  await sock.sendMessage(from, {
    text: `🔍 _Fetching live scores..._`,
  });

  try {
    const data = await getLiveFixtures();
    const fixtures = data?.response;

    if (!fixtures || fixtures.length === 0) {
      return sock.sendMessage(from, {
        text: `⚽ *NO LIVE MATCHES*\n━━━━━━━━━━━━━━━━━━━━━━\n\nHakuna mchezo sasa hivi bana! 😅\n\nTry *.today* to see upcoming matches\nor *.tomorrow* for tomorrow's fixtures\n\n🕐 ${getEATTime()} EAT\n━━━━━━━━━━━━━━━━━━━━━━\n_Powered by Cymor 🤖_`,
      });
    }

    // Group by league
    const grouped = {};
    for (const fix of fixtures) {
      const leagueId = fix.league.id;
      const leagueName = fix.league.name;
      if (!grouped[leagueName]) {
        grouped[leagueName] = { id: leagueId, matches: [] };
      }
      grouped[leagueName].matches.push(fix);
    }

    let text = `🔴 *LIVE SCORES — CYMOR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🕐 Updated: ${getEATTime()} EAT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [league, data] of Object.entries(grouped)) {
      const flag = getLeagueEmoji(data.id);
      text += `${flag} *${league}*\n`;

      for (const fix of data.matches) {
        const home = fix.teams.home.name;
        const away = fix.teams.away.name;
        const homeGoals = fix.goals.home ?? 0;
        const awayGoals = fix.goals.away ?? 0;
        const minute = fix.fixture.status.elapsed;
        const status = fix.fixture.status.short;
        const statusEmoji = getStatusEmoji(status);

        let statusText = '';
        if (status === 'HT') statusText = 'HT';
        else if (minute) statusText = `${minute}'`;
        else statusText = status;

        text += `${statusEmoji} *${home}* ${homeGoals} - ${awayGoals} *${away}*\n`;
        text += `   ⏱️ ${statusText}\n`;

        // Show recent events (goals)
        const events = fix.events || [];
        const goals = events.filter((e) => e.type === 'Goal');
        for (const goal of goals) {
          const scorer = goal.player?.name || 'Unknown';
          const team = goal.team?.name;
          const isHome = team === home;
          text += `   ⚽ ${isHome ? '🏠' : '✈️'} ${scorer} ${goal.time?.elapsed}'\n`;
        }

        text += '\n';
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔄 Type *.live* to refresh\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Live command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Error fetching live scores*\n\nAPI imekataa bana 😅 Try again in a minute.\n\n_Powered by Cymor 🤖_`,
    });
  }
}
