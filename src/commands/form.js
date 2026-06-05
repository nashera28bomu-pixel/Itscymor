import { searchTeam, getTeamForm } from '../services/footballAPI.js';
import { utcToEAT } from '../utils/time.js';

export async function formCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  await sock.sendMessage(from, {
    text: `🔍 _Fetching form for ${params}..._`,
  });

  try {
    const teamData = await searchTeam(params);
    const team = teamData?.response?.[0]?.team;

    if (!team) {
      return sock.sendMessage(from, {
        text: `❌ *Team not found!*\n\nCould not find "*${params}*"\nCheck spelling and try again 😅\n\n_Powered by Cymor 🤖_`,
      });
    }

    const formData = await getTeamForm(team.id, 10);
    const fixtures = formData?.response || [];

    if (fixtures.length === 0) {
      return sock.sendMessage(from, {
        text: `📊 No recent fixtures found for *${team.name}* 😅\n\n_Powered by Cymor 🤖_`,
      });
    }

    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    const formString = [];

    for (const f of fixtures) {
      const isHome = f.teams.home.id === team.id;
      const myGoals = isHome ? f.goals.home : f.goals.away;
      const theirGoals = isHome ? f.goals.away : f.goals.home;

      goalsFor += myGoals || 0;
      goalsAgainst += theirGoals || 0;

      if (myGoals > theirGoals) { wins++; formString.push('🟢'); }
      else if (myGoals < theirGoals) { losses++; formString.push('🔴'); }
      else { draws++; formString.push('🟡'); }
    }

    let text = `📈 *TEAM FORM — CYMOR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏟️ *${team.name}*\n`;
    text += `📊 Last ${fixtures.length} matches\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🔥 *FORM*\n`;
    text += formString.join(' ') + '\n\n';

    text += `📊 *SUMMARY*\n`;
    text += `🟢 Wins: *${wins}* | 🟡 Draws: *${draws}* | 🔴 Losses: *${losses}*\n`;
    text += `⚽ Goals For: *${goalsFor}* | Against: *${goalsAgainst}*\n`;
    text += `📈 Avg per game: *${(goalsFor / fixtures.length).toFixed(1)}* scored, *${(goalsAgainst / fixtures.length).toFixed(1)}* conceded\n\n`;

    text += `📋 *RECENT RESULTS*\n`;
    for (const f of fixtures.slice(0, 8)) {
      const isHome = f.teams.home.id === team.id;
      const opponent = isHome ? f.teams.away.name : f.teams.home.name;
      const myGoals = isHome ? f.goals.home : f.goals.away;
      const theirGoals = isHome ? f.goals.away : f.goals.home;
      const venue = isHome ? '🏠' : '✈️';
      const date = utcToEAT(f.fixture.timestamp);

      let result = '🟡';
      if (myGoals > theirGoals) result = '🟢';
      else if (myGoals < theirGoals) result = '🔴';

      const scoreDisplay = isHome
        ? `${myGoals}-${theirGoals}`
        : `${theirGoals}-${myGoals}`;

      text += `${result} ${venue} vs *${opponent}*\n`;
      text += `   Score: ${isHome ? team.name : opponent} ${scoreDisplay} ${isHome ? opponent : team.name}\n`;
      text += `   📅 ${date}\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🟢 Win  🟡 Draw  🔴 Loss\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Form command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching form data. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
