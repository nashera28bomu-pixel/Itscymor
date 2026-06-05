import { getStandings } from '../services/footballAPI.js';
import { getEATTime } from '../utils/time.js';

const LEAGUE_MAP = {
  'premier league': { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'epl': { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'la liga': { id: 140, name: 'La Liga', flag: '🇪🇸' },
  'laliga': { id: 140, name: 'La Liga', flag: '🇪🇸' },
  'serie a': { id: 135, name: 'Serie A', flag: '🇮🇹' },
  'bundesliga': { id: 78, name: 'Bundesliga', flag: '🇩🇪' },
  'ligue 1': { id: 61, name: 'Ligue 1', flag: '🇫🇷' },
  'ligue1': { id: 61, name: 'Ligue 1', flag: '🇫🇷' },
  'champions league': { id: 2, name: 'Champions League', flag: '⭐' },
  'ucl': { id: 2, name: 'Champions League', flag: '⭐' },
  'mls': { id: 253, name: 'MLS', flag: '🇺🇸' },
};

const DEFAULT_LEAGUE = { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' };

export async function tableCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  const leagueKey = params?.toLowerCase().trim() || 'premier league';
  const league = LEAGUE_MAP[leagueKey] || DEFAULT_LEAGUE;

  await sock.sendMessage(from, {
    text: `🔍 _Fetching ${league.name} standings..._`,
  });

  try {
    const data = await getStandings(league.id);
    const standings = data?.response?.[0]?.league?.standings?.[0];

    if (!standings || standings.length === 0) {
      return sock.sendMessage(from, {
        text: `❌ *Standings not available*\n\nHii league haipo bana 😅\n\nTry:\n.table Premier League\n.table La Liga\n.table Serie A\n.table Bundesliga\n.table Ligue 1\n.table UCL\n\n_Powered by Cymor 🤖_`,
      });
    }

    let text = `🏆 *${league.flag} ${league.name.toUpperCase()} TABLE*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🕐 ${getEATTime()} EAT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `${'#'.padEnd(3)} ${'Team'.padEnd(22)} ${'P'.padEnd(3)} ${'W'.padEnd(3)} ${'D'.padEnd(3)} ${'L'.padEnd(3)} ${'GD'.padEnd(5)} Pts\n`;
    text += `${'─'.repeat(46)}\n`;

    for (const team of standings) {
      const pos = String(team.rank).padEnd(3);
      const name = team.team.name.substring(0, 20).padEnd(22);
      const played = String(team.all.played).padEnd(3);
      const wins = String(team.all.win).padEnd(3);
      const draws = String(team.all.draw).padEnd(3);
      const losses = String(team.all.lose).padEnd(3);
      const gd = String(team.goalsDiff >= 0 ? `+${team.goalsDiff}` : team.goalsDiff).padEnd(5);
      const pts = String(team.points);

      // Add zone emoji
      let zoneEmoji = '';
      if (team.rank <= 4) zoneEmoji = '🔵'; // Champions League
      else if (team.rank <= 6) zoneEmoji = '🟠'; // Europa League
      else if (team.rank >= standings.length - 2) zoneEmoji = '🔴'; // Relegation

      text += `${zoneEmoji || ' '}${pos} ${name} ${played} ${wins} ${draws} ${losses} ${gd} *${pts}*\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔵 Champions League  🟠 Europa League\n`;
    text += `🔴 Relegation Zone\n`;
    text += `\n📋 *Other tables:*\n`;
    text += `_.table La Liga | .table Serie A_\n`;
    text += `_.table Bundesliga | .table UCL_\n`;
    text += `_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Table command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching standings. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
