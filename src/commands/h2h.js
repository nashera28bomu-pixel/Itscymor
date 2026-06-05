import { searchTeam, getH2H } from '../services/footballAPI.js';
import { getEATTime, utcToEAT } from '../utils/time.js';

export async function h2hCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  const vsRegex = /(.+?)\s+vs\s+(.+)/i;
  const match = params.match(vsRegex);
  if (!match) {
    return sock.sendMessage(from, {
      text: `❌ *Usage:* .h2h [Team A] vs [Team B]\n\nExample:\n.h2h Real Madrid vs Barcelona\n\n_Powered by Cymor 🤖_`,
    });
  }

  const team1Name = match[1].trim();
  const team2Name = match[2].trim();

  await sock.sendMessage(from, {
    text: `🔍 _Fetching H2H for ${team1Name} vs ${team2Name}..._`,
  });

  try {
    const [t1Data, t2Data] = await Promise.all([
      searchTeam(team1Name),
      searchTeam(team2Name),
    ]);

    const team1 = t1Data?.response?.[0]?.team;
    const team2 = t2Data?.response?.[0]?.team;

    if (!team1 || !team2) {
      return sock.sendMessage(from, {
        text: `❌ *Team not found!*\n\nCheck spelling and try again 😅\n\n_Powered by Cymor 🤖_`,
      });
    }

    const h2hData = await getH2H(team1.id, team2.id, 10);
    const fixtures = h2hData?.response || [];

    if (fixtures.length === 0) {
      return sock.sendMessage(from, {
        text: `📊 *H2H: ${team1.name} vs ${team2.name}*\n\nNo previous meetings found! 🤷\n\n_Powered by Cymor 🤖_`,
      });
    }

    // Calculate stats
    let t1Wins = 0, t2Wins = 0, draws = 0;
    let t1Goals = 0, t2Goals = 0;

    for (const f of fixtures) {
      const homeGoals = f.goals.home;
      const awayGoals = f.goals.away;
      const isT1Home = f.teams.home.id === team1.id;

      const myGoals = isT1Home ? homeGoals : awayGoals;
      const theirGoals = isT1Home ? awayGoals : homeGoals;

      t1Goals += myGoals;
      t2Goals += theirGoals;

      if (myGoals > theirGoals) t1Wins++;
      else if (myGoals < theirGoals) t2Wins++;
      else draws++;
    }

    let text = `🔄 *HEAD TO HEAD — CYMOR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚽ *${team1.name}* vs *${team2.name}*\n`;
    text += `📊 Last ${fixtures.length} meetings\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📈 *OVERALL RECORD*\n`;
    text += `🏠 ${team1.name}: *${t1Wins}W* | 🤝 *${draws}D* | ✈️ *${t2Wins}W* ${team2.name}\n`;
    text += `⚽ Goals: ${team1.name} *${t1Goals}* — *${t2Goals}* ${team2.name}\n\n`;

    text += `📋 *RECENT MEETINGS*\n`;

    for (const f of fixtures.slice(0, 8)) {
      const date = utcToEAT(f.fixture.timestamp);
      const home = f.teams.home.name;
      const away = f.teams.away.name;
      const hg = f.goals.home;
      const ag = f.goals.away;

      let result = '🤝';
      if (hg > ag) result = f.teams.home.id === team1.id ? '✅' : '❌';
      else if (hg < ag) result = f.teams.away.id === team1.id ? '✅' : '❌';

      text += `${result} ${date}\n`;
      text += `   *${home}* ${hg} - ${ag} *${away}*\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✅ = ${team1.name} win  ❌ = ${team2.name} win\n`;
    text += `💡 Type *.predict ${team1Name} vs ${team2Name}*\nfor AI prediction\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('H2H command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching H2H data. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
