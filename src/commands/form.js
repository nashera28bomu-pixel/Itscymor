import { searchTeam, getTeamForm } from '../services/footballAPI.js';
import { utcToEATTime } from '../utils/time.js';

function getResultEmoji(fixture, teamId) {
  const homeId = fixture.teams?.home?.id;
  const homeGoals = fixture.goals?.home;
  const awayGoals = fixture.goals?.away;

  if (homeGoals === null || awayGoals === null) return '⏳';
  if (homeGoals === awayGoals) return '🟡'; // Draw

  const homeWon = homeGoals > awayGoals;
  const isHome = homeId === teamId;

  return (homeWon && isHome) || (!homeWon && !isHome) ? '🟢' : '🔴';
}

export async function formCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  await sock.sendMessage(from, { text: `🔍 _Searching for ${params}..._` });

  try {
    // Step 1: Search team
    const searchData = await searchTeam(params);
    const teams = searchData?.response;

    if (!teams || teams.length === 0) {
      return sock.sendMessage(from, {
        text: `❌ *Team not found:* ${params}\n\nTry full name e.g:\n/form Arsenal\n/form Real Madrid\n/form France\n\n_Powered by Cymor 🤖_`,
      });
    }

    const team = teams[0].team || teams[0];
    const teamId = team.id;
    const teamName = team.name;

    await sock.sendMessage(from, { text: `📊 _Fetching form for ${teamName}..._` });

    // Step 2: Get last 5 matches
    const formData = await getTeamForm(teamId, 5);
    const fixtures = formData?.response;

    if (!fixtures || fixtures.length === 0) {
      return sock.sendMessage(from, {
        text: `⚠️ *${teamName}*\n\nNo recent matches found.\nSeason may be on break.\n\n_Powered by Cymor 🤖_`,
      });
    }

    // Step 3: Build form string
    const formString = fixtures
      .slice(-5)
      .map(f => getResultEmoji(f, teamId))
      .join(' ');

    let text = `📊 *${teamName.toUpperCase()} — RECENT FORM*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🏃 Last 5: ${formString}\n`;
    text += `🟢 Win  🟡 Draw  🔴 Loss\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;

    let wins = 0, draws = 0, losses = 0;

    for (const fix of fixtures.slice(-5)) {
      const home = fix.teams?.home?.name || 'Home';
      const away = fix.teams?.away?.name || 'Away';
      const hg = fix.goals?.home ?? '?';
      const ag = fix.goals?.away ?? '?';
      const date = new Date(fix.fixture.timestamp * 1000).toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short',
      });
      const status = fix.fixture.status.short;
      const result = getResultEmoji(fix, teamId);

      text += `${result} *${home}* ${hg}-${ag} *${away}*\n`;
      text += `   📅 ${date} | ${status}\n\n`;

      if (result === '🟢') wins++;
      else if (result === '🟡') draws++;
      else if (result === '🔴') losses++;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 W:${wins} D:${draws} L:${losses} (last 5)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 /predict ${teamName} vs [opponent]\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });

  } catch (err) {
    console.error('Form command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching form for *${params}*\nTry again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
