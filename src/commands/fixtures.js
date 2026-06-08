import { getFixturesByDate } from '../services/footballAPI.js';
import { getEATDate, getEATTime, getAPIDate, getWeekendDates, utcToEATTime, getLeagueEmoji } from '../utils/time.js';

// Priority leagues to show first (including international)
const PRIORITY_LEAGUES = [1, 2, 3, 10, 31, 6, 29, 5, 9, 39, 140, 135, 78, 61, 253, 667, 668, 669, 670, 671];

function sortFixtures(fixtures) {
  return fixtures.sort((a, b) => {
    const aP = PRIORITY_LEAGUES.indexOf(a.league.id);
    const bP = PRIORITY_LEAGUES.indexOf(b.league.id);
    const aPriority = aP === -1 ? 999 : aP;
    const bPriority = bP === -1 ? 999 : bP;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.fixture.timestamp - b.fixture.timestamp;
  });
}
const data = await getFixturesByDate(date);
console.log('API returned:', data?.response?.length, 'fixtures');
console.log(JSON.stringify(data?.response?.slice(0,2)));
function buildFixturesMessage(fixtures, title, dateLabel) {
  if (!fixtures || fixtures.length === 0) {
    return `📅 *${title}*\n━━━━━━━━━━━━━━━━━━━━━━\n\nHakuna matches ${dateLabel} bana! 😅\n\n_Powered by Cymor 🤖_`;
  }

  const sorted = sortFixtures(fixtures);

  // Group by league
  const grouped = {};
  for (const fix of sorted) {
    const leagueName = fix.league.name;
    const country = fix.league.country;
    const leagueId = fix.league.id;
    const key = `${leagueName}||${leagueId}||${country}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fix);
  }

  let text = `📅 *${title}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📆 ${dateLabel}\n`;
  text += `🕐 All times in EAT (UTC+3)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let totalMatches = 0;

  for (const [key, matches] of Object.entries(grouped)) {
    const [leagueName, leagueId, country] = key.split('||');
    const flag = getLeagueEmoji(parseInt(leagueId));

    text += `${flag} *${leagueName}*`;
    if (country && country !== 'World') text += ` (${country})`;
    text += '\n';

    for (const fix of matches) {
      const home = fix.teams.home.name;
      const away = fix.teams.away.name;
      const time = utcToEATTime(fix.fixture.timestamp);
      const status = fix.fixture.status.short;

      let statusDisplay = `🕐 ${time}`;
      if (status === 'NS') statusDisplay = `🕐 ${time}`;
      else if (status === 'PST') statusDisplay = `📅 Postponed`;
      else if (status === 'CANC') statusDisplay = `❌ Cancelled`;

      text += ` ${statusDisplay} | *${home}* vs *${away}*\n`;
      totalMatches++;
    }
    text += '\n';
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 Total: ${totalMatches} matches\n`;
  text += `💡 Type *.predict [team vs team]* for analysis\n`;
  text += `🔥 Type *.picks* for best bets\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Powered by Cymor 🤖_`;

  return text;
}

export async function todayCommand(sock, msg, ctx) {
  const { from } = ctx;

  await sock.sendMessage(from, { text: `🔍 _Fetching today's fixtures..._` });

  try {
    const date = getAPIDate(0);
    const data = await getFixturesByDate(date);
    const dateLabel = getEATDate();
    const text = buildFixturesMessage(data?.response, "TODAY'S FIXTURES — CYMOR", dateLabel);
    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Today command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching fixtures. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}

export async function tomorrowCommand(sock, msg, ctx) {
  const { from } = ctx;

  await sock.sendMessage(from, { text: `🔍 _Fetching tomorrow's fixtures..._` });

  try {
    const date = getAPIDate(1);
    const data = await getFixturesByDate(date);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateLabel = tomorrow.toLocaleDateString('en-KE', {
      timeZone: 'Africa/Nairobi',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const text = buildFixturesMessage(data?.response, "TOMORROW'S FIXTURES — CYMOR", dateLabel);
    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Tomorrow command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching fixtures. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}

export async function weekendCommand(sock, msg, ctx) {
  const { from } = ctx;

  await sock.sendMessage(from, { text: `🔍 _Fetching weekend fixtures..._` });

  try {
    const { saturday, sunday } = getWeekendDates();

    const [satData, sunData] = await Promise.all([
      getFixturesByDate(saturday),
      getFixturesByDate(sunday),
    ]);

    const satMatches = satData?.response || [];
    const sunMatches = sunData?.response || [];
    const allMatches = [...satMatches, ...sunMatches];

    const dateLabel = `${saturday} to ${sunday}`;
    const text = buildFixturesMessage(allMatches, '🗓️ WEEKEND FIXTURES — CYMOR', dateLabel);
    await sock.sendMessage(from, { text });
  } catch (err) {
    console.error('Weekend command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Error fetching weekend fixtures. Try again! 😅\n\n_Powered by Cymor 🤖_`,
    });
  }
}
