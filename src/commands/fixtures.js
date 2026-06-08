import { getFixturesByDate } from '../services/footballAPI.js';
import { getEATDate, getAPIDate, getWeekendDates, utcToEATTime, getLeagueEmoji } from '../utils/time.js';

// 🏆 World Cup 2026 + Priority leagues
// 1 = World Cup, 667-671 = friendlies/internationals
const PRIORITY_LEAGUES = [
  1,    // 🏆 FIFA World Cup
  2,    // 🏆 UEFA Champions League
  3,    // 🏆 UEFA Europa League
  848,  // 🏆 UEFA Conference League
  10,   // 🌍 FIFA World Cup Qualification
  31,   // 🌍 Africa Cup of Nations
  6,    // 🌍 AFC Asian Cup
  29,   // 🌍 UEFA Nations League
  5,    // 🌍 UEFA Euro
  39,   // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
  140,  // 🇪🇸 La Liga
  135,  // 🇮🇹 Serie A
  78,   // 🇩🇪 Bundesliga
  61,   // 🇫🇷 Ligue 1
  94,   // 🇵🇹 Primeira Liga
  253,  // 🇺🇸 MLS
  9,    // 🌍 Copa America
  667,  // 🌍 International Friendlies
  668,
  669,
  670,
  671,
];

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

  // 🏆 World Cup banner if present
  const hasWorldCup = Object.keys(grouped).some(k => k.includes('||1||'));
  
  let text = '';
  if (hasWorldCup) {
    text += `🏆🌍 *FIFA WORLD CUP 2026 IS HERE!* 🌍🏆\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  text += `📅 *${title}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📆 ${dateLabel}\n`;
  text += `🕐 All times in EAT (UTC+3)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let totalMatches = 0;

  for (const [key, matches] of Object.entries(grouped)) {
    const [leagueName, leagueId, country] = key.split('||');
    const flag = getLeagueEmoji(parseInt(leagueId));

    // Extra hype for World Cup
    const isWC = parseInt(leagueId) === 1;
    text += isWC ? `🏆🔥 *${leagueName}* 🔥🏆\n` : `${flag} *${leagueName}*\n`;

    for (const fix of matches) {
      const home = fix.teams.home.name;
      const away = fix.teams.away.name;
      const time = utcToEATTime(fix.fixture.timestamp);
      const status = fix.fixture.status.short;
      const elapsed = fix.fixture.status.elapsed;

      let statusDisplay;
      if (status === 'NS') statusDisplay = `🕐 ${time}`;
      else if (status === '1H' || status === '2H') statusDisplay = `🔴 LIVE ${elapsed}'`;
      else if (status === 'HT') statusDisplay = `⏸ HT`;
      else if (status === 'FT') statusDisplay = `✅ FT`;
      else if (status === 'PST') statusDisplay = `📅 Postponed`;
      else if (status === 'CANC') statusDisplay = `❌ Cancelled`;
      else statusDisplay = `🕐 ${time}`;

      const homeGoals = fix.goals?.home ?? '';
      const awayGoals = fix.goals?.away ?? '';
      const score = (status !== 'NS' && homeGoals !== '') ? ` *${homeGoals}-${awayGoals}*` : '';

      text += ` ${statusDisplay}${score} | *${home}* vs *${away}*\n`;
      totalMatches++;
    }
    text += '\n';
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 Total: ${totalMatches} matches\n`;
  text += `💡 /predict [team vs team] for analysis\n`;
  text += `🔥 /picks for best bets today\n`;
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
    console.log(`📊 API returned ${data?.response?.length ?? 0} fixtures for ${date}`);
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
    console.log(`📊 API returned ${data?.response?.length ?? 0} fixtures for ${date}`);

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

    const allMatches = [...(satData?.response || []), ...(sunData?.response || [])];
    console.log(`📊 Weekend: ${allMatches.length} total fixtures`);

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
