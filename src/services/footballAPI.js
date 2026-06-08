import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

// ── football-data.org (free, no card, reliable) ───────────────────────
const fdAPI = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY,
  },
});

// ── worldcup26.ir (completely free, no key needed) ────────────────────
const wcAPI = axios.create({
  baseURL: 'https://worldcup26.ir',
  timeout: 8000,
});

// ── api-football fallback (existing key, 100 req/day) ─────────────────
const apiFoot = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  },
  timeout: 8000,
});

export const LEAGUES = {
  EPL:          { id: 'PL',  fdId: 2021, name: 'Premier League',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LA_LIGA:      { id: 'PD',  fdId: 2014, name: 'La Liga',                  flag: '🇪🇸' },
  SERIE_A:      { id: 'SA',  fdId: 2019, name: 'Serie A',                  flag: '🇮🇹' },
  BUNDESLIGA:   { id: 'BL1', fdId: 2002, name: 'Bundesliga',               flag: '🇩🇪' },
  LIGUE_1:      { id: 'FL1', fdId: 2015, name: 'Ligue 1',                  flag: '🇫🇷' },
  UCL:          { id: 'CL',  fdId: 2001, name: 'Champions League',         flag: '⭐' },
  FIFA_WC:      { id: 'WC',  fdId: 2000, name: 'FIFA World Cup 2026',      flag: '🏆' },
  FRIENDLIES:   { id: null,  fdId: null, name: 'International Friendlies', flag: '🤝' },
};

const CURRENT_SEASON = 2025;

// ── Generic cache wrapper ─────────────────────────────────────────────
async function withCache(key, fn) {
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await fn();
  cache.set(key, result);
  return result;
}

// ── Normalize football-data.org match to common format ────────────────
function normalizeFDMatch(match, leagueName, leagueFlag) {
  const statusMap = {
    SCHEDULED: 'NS',
    LIVE: '1H',
    IN_PLAY: '1H',
    HALFTIME: 'HT',
    FINISHED: 'FT',
    POSTPONED: 'PST',
    CANCELLED: 'CANC',
    SUSPENDED: 'PST',
  };

  return {
    fixture: {
      id: match.id,
      timestamp: new Date(match.utcDate).getTime() / 1000,
      status: {
        short: statusMap[match.status] || 'NS',
        elapsed: match.minute || null,
      },
    },
    league: {
      id: match.competition?.id || 0,
      name: leagueName || match.competition?.name || 'Unknown',
      country: match.area?.name || 'World',
      flag: leagueFlag || '🌍',
    },
    teams: {
      home: { name: match.homeTeam?.shortName || match.homeTeam?.name || 'TBD' },
      away: { name: match.awayTeam?.shortName || match.awayTeam?.name || 'TBD' },
    },
    goals: {
      home: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null,
      away: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null,
    },
  };
}

// ── Normalize worldcup26.ir match to common format ────────────────────
function normalizeWCMatch(match) {
  const now = Date.now();
  // Handle various date field names and formats safely
  const rawDate = match.date || match.utcDate || match.datetime || match.match_date || null;
  const matchTime = rawDate ? new Date(rawDate).getTime() : null;

  // Skip invalid dates
  if (!matchTime || isNaN(matchTime)) return null;

  const diffMin = (now - matchTime) / 60000;

  let statusShort = 'NS';
  if (match.score?.home !== null && match.score?.away !== null) {
    statusShort = diffMin > 110 ? 'FT' : '1H';
  }

  return {
    fixture: {
      id: match.id || Math.random(),
      timestamp: matchTime / 1000, // safe, checked above
      status: { short: statusShort, elapsed: null },
    },
    league: {
      id: 1,
      name: 'FIFA World Cup 2026',
      country: 'World',
      flag: '🏆',
    },
    teams: {
      home: { name: match.home_team || match.team1 || 'TBD' },
      away: { name: match.away_team || match.team2 || 'TBD' },
    },
    goals: {
      home: match.score?.home ?? match.home_score ?? null,
      away: match.score?.away ?? match.away_score ?? null,
    },
  };
}

// ── Get World Cup fixtures ────────────────────────────────────────────
async function getWorldCupFixtures() {
  try {
    const res = await wcAPI.get('/get/games');
    const games = res.data?.games || res.data || [];
    return Array.isArray(games)
      ? games.map(normalizeWCMatch).filter(Boolean)
      : [];
  } catch (err) {
    console.error('⚠️ WC API failed:', err.message);
    return [];
  }
}

// ── Get fixtures by date (main function) ─────────────────────────────
export async function getFixturesByDate(date) {
  return withCache(`fixtures_${date}`, async () => {
    const allFixtures = [];

    // 1. World Cup fixtures (always fetch)
    const wcFixtures = await getWorldCupFixtures();
    const wcForDate = wcFixtures.filter(f => {
      const d = new Date(f.fixture.timestamp * 1000).toISOString().split('T')[0];
      return d === date;
    });
    allFixtures.push(...wcForDate);
    console.log(`🏆 WC fixtures for ${date}: ${wcForDate.length}`);

    // 2. football-data.org for club leagues
    if (process.env.FOOTBALL_DATA_API_KEY) {
      try {
        const competitions = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL'];
        const promises = competitions.map(comp =>
          fdAPI.get(`/competitions/${comp}/matches`, {
            params: { dateFrom: date, dateTo: date },
          }).catch(() => null)
        );

        const results = await Promise.all(promises);
        const leagueMap = {
          PL: { name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
          PD: { name: 'La Liga', flag: '🇪🇸' },
          SA: { name: 'Serie A', flag: '🇮🇹' },
          BL1: { name: 'Bundesliga', flag: '🇩🇪' },
          FL1: { name: 'Ligue 1', flag: '🇫🇷' },
          CL: { name: 'Champions League', flag: '⭐' },
        };

        for (let i = 0; i < results.length; i++) {
          const res = results[i];
          if (!res?.data?.matches) continue;
          const comp = competitions[i];
          const { name, flag } = leagueMap[comp];
          const normalized = res.data.matches.map(m => normalizeFDMatch(m, name, flag));
          allFixtures.push(...normalized);
        }

        console.log(`📊 football-data.org fixtures for ${date}: ${allFixtures.length - wcForDate.length}`);
      } catch (err) {
        console.error('⚠️ football-data.org failed:', err.message);
      }
    }

    // 3. Fallback to api-football if still empty
    if (allFixtures.length === 0 && process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/fixtures', {
          params: { date, timezone: 'Africa/Nairobi' },
        });
        const fixtures = res.data?.response || [];
        allFixtures.push(...fixtures);
        console.log(`📊 api-football fallback fixtures: ${fixtures.length}`);
      } catch (err) {
        console.error('⚠️ api-football fallback failed:', err.message);
      }
    }

    return { response: allFixtures };
  });
}

// ── Live fixtures ─────────────────────────────────────────────────────
export async function getLiveFixtures() {
  return withCache('live_fixtures', async () => {
    const allLive = [];

    // WC live
    const wcFixtures = await getWorldCupFixtures();
    const wcLive = wcFixtures.filter(f =>
      ['1H', '2H', 'HT'].includes(f.fixture.status.short)
    );
    allLive.push(...wcLive);

    // api-football live
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/fixtures', { params: { live: 'all' } });
        allLive.push(...(res.data?.response || []));
      } catch {}
    }

    return { response: allLive };
  });
}

// ── Search team ───────────────────────────────────────────────────────
export async function searchTeam(name) {
  return withCache(`team_${name}`, async () => {
    // Try football-data.org first
    if (process.env.FOOTBALL_DATA_API_KEY) {
      try {
        // Search across competitions
        const competitions = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'WC'];
        for (const comp of competitions) {
          const res = await fdAPI.get(`/competitions/${comp}/teams`).catch(() => null);
          if (!res?.data?.teams) continue;
          const found = res.data.teams.filter(t =>
            t.name?.toLowerCase().includes(name.toLowerCase()) ||
            t.shortName?.toLowerCase().includes(name.toLowerCase())
          );
          if (found.length > 0) {
            return { response: found.map(t => ({ team: { id: t.id, name: t.name }, league: comp })) };
          }
        }
      } catch {}
    }

    // Fallback to api-football
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/teams', { params: { search: name } });
        return res.data;
      } catch {}
    }

    return { response: [] };
  });
}

// ── Team form (last N matches) ────────────────────────────────────────
export async function getTeamForm(teamId, last = 5, source = 'apifootball') {
  return withCache(`form_${teamId}_${last}`, async () => {
    if (source === 'fd' && process.env.FOOTBALL_DATA_API_KEY) {
      try {
        const res = await fdAPI.get(`/teams/${teamId}/matches`, {
          params: { status: 'FINISHED', limit: last },
        });
        const matches = res.data?.matches || [];
        return {
          response: matches.map(m => normalizeFDMatch(m, null, null)),
        };
      } catch {}
    }

    // api-football fallback
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/fixtures', {
          params: { team: teamId, last, timezone: 'Africa/Nairobi' },
        });
        return res.data;
      } catch {}
    }

    return { response: [] };
  });
}

// ── Head to head ──────────────────────────────────────────────────────
export async function getH2H(team1Id, team2Id, last = 10) {
  return withCache(`h2h_${team1Id}_${team2Id}`, async () => {
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/fixtures/headtohead', {
          params: { h2h: `${team1Id}-${team2Id}`, last, timezone: 'Africa/Nairobi' },
        });
        return res.data;
      } catch {}
    }
    return { response: [] };
  });
}

// ── Standings ─────────────────────────────────────────────────────────
export async function getStandings(leagueId, season = CURRENT_SEASON) {
  return withCache(`standings_${leagueId}`, async () => {
    // Map league name to football-data.org code
    const fdCodeMap = { 39: 'PL', 140: 'PD', 135: 'SA', 78: 'BL1', 61: 'FL1', 2: 'CL', 1: 'WC' };
    const fdCode = fdCodeMap[leagueId];

    if (fdCode && process.env.FOOTBALL_DATA_API_KEY) {
      try {
        const res = await fdAPI.get(`/competitions/${fdCode}/standings`);
        const standings = res.data?.standings?.[0]?.table || [];
        return {
          response: [{
            league: { standings: [standings.map(s => ({
              rank: s.position,
              team: { name: s.team.name },
              points: s.points,
              goalsDiff: s.goalDifference,
              all: { played: s.playedGames, win: s.won, draw: s.draw, lose: s.lost },
            }))] }
          }]
        };
      } catch {}
    }

    // Fallback
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const res = await apiFoot.get('/standings', { params: { league: leagueId, season } });
        return res.data;
      } catch {}
    }

    return { response: [] };
  });
}

// ── Team stats ────────────────────────────────────────────────────────
export async function getTeamStats(teamId, leagueId, season = CURRENT_SEASON) {
  if (process.env.FOOTBALL_API_KEY) {
    try {
      const res = await apiFoot.get('/teams/statistics', {
        params: { team: teamId, league: leagueId, season },
      });
      return res.data;
    } catch {}
  }
  return { response: null };
}

// ── World Cup specific ────────────────────────────────────────────────
export async function getWorldCupGroups() {
  return withCache('wc_groups', async () => {
    try {
      const res = await wcAPI.get('/get/groups');
      return res.data;
    } catch {
      return null;
    }
  });
}

export async function getWorldCupTeams() {
  return withCache('wc_teams', async () => {
    try {
      const res = await wcAPI.get('/get/teams');
      return res.data;
    } catch {
      return null;
    }
  });
}

export { cache };
