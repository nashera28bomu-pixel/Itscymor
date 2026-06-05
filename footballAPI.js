import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

const footballAPI = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': process.env.FOOTBALL_API_HOST,
  },
});

// Leagues we support including International
export const LEAGUES = {
  // Club Competitions
  EPL: { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LA_LIGA: { id: 140, name: 'La Liga', flag: '🇪🇸' },
  SERIE_A: { id: 135, name: 'Serie A', flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', flag: '🇩🇪' },
  LIGUE_1: { id: 61, name: 'Ligue 1', flag: '🇫🇷' },
  UCL: { id: 2, name: 'Champions League', flag: '⭐' },
  UEL: { id: 3, name: 'Europa League', flag: '🟠' },
  MLS: { id: 253, name: 'MLS', flag: '🇺🇸' },
  // International
  FIFA_WC: { id: 1, name: 'FIFA World Cup', flag: '🏆' },
  FIFA_WCQ: { id: 31, name: 'World Cup Qualifiers', flag: '🌍' },
  FRIENDLIES: { id: 10, name: 'International Friendlies', flag: '🤝' },
  AFCON: { id: 6, name: 'Africa Cup of Nations', flag: '🌍' },
  AFCON_Q: { id: 29, name: 'AFCON Qualifiers', flag: '🌍' },
  NATIONS_LEAGUE: { id: 5, name: 'UEFA Nations League', flag: '🇪🇺' },
  COPA_AMERICA: { id: 9, name: 'Copa America', flag: '🌎' },
};

// Current season
const CURRENT_SEASON = 2025;

async function apiGet(endpoint, params = {}) {
  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await footballAPI.get(endpoint, { params });
    const data = response.data;
    cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`❌ Football API error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Get live fixtures
export async function getLiveFixtures() {
  return apiGet('/fixtures', { live: 'all' });
}

// Get fixtures by date
export async function getFixturesByDate(date) {
  const leagueIds = Object.values(LEAGUES).map((l) => l.id).join('-');
  return apiGet('/fixtures', {
    date,
    season: CURRENT_SEASON,
    timezone: 'Africa/Nairobi',
  });
}

// Get team form (last N fixtures)
export async function getTeamForm(teamId, last = 5) {
  return apiGet('/fixtures', {
    team: teamId,
    last,
    timezone: 'Africa/Nairobi',
  });
}

// Search team by name
export async function searchTeam(name) {
  return apiGet('/teams', { search: name });
}

// Head to head
export async function getH2H(team1Id, team2Id, last = 10) {
  return apiGet('/fixtures/headtohead', {
    h2h: `${team1Id}-${team2Id}`,
    last,
    timezone: 'Africa/Nairobi',
  });
}

// League standings
export async function getStandings(leagueId, season = CURRENT_SEASON) {
  return apiGet('/standings', { league: leagueId, season });
}

// Team statistics
export async function getTeamStats(teamId, leagueId, season = CURRENT_SEASON) {
  return apiGet('/teams/statistics', {
    team: teamId,
    league: leagueId,
    season,
  });
}

// Get injuries
export async function getInjuries(teamId, leagueId, season = CURRENT_SEASON) {
  return apiGet('/injuries', { team: teamId, league: leagueId, season });
}

// Fixture by ID (detailed)
export async function getFixtureById(fixtureId) {
  return apiGet('/fixtures', { id: fixtureId });
}

export { cache };
