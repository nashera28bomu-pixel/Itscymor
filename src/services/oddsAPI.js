import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

const oddsAPI = axios.create({
  baseURL: 'https://api.the-odds-api.com/v4',
  params: {
    apiKey: process.env.ODDS_API_KEY,
  },
});

// Sports we track
export const SPORTS = [
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
  'soccer_uefa_champs_league',
  'soccer_usa_mls',
  'soccer_fifa_world_cup',
  'soccer_international_friendlies',
];

// Kenyan bookmakers we support
export const BOOKMAKERS = {
  sportpesa: 'SportPesa 🇰🇪',
  betika: 'Betika 🇰🇪',
  odibets: 'OdiBets 🇰🇪',
  bet365: 'Bet365 🌍',
  '1xbet': '1xBet 🌍',
  betway: 'Betway 🌍',
};

async function apiGet(endpoint, params = {}) {
  const cacheKey = `odds_${endpoint}_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await oddsAPI.get(endpoint, { params });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (err) {
    console.error(`❌ Odds API error [${endpoint}]:`, err.message);
    return null;
  }
}

// Get odds for a sport
export async function getOddsForSport(sport) {
  return apiGet(`/sports/${sport}/odds`, {
    regions: 'af,eu',
    markets: 'h2h,totals',
    oddsFormat: 'decimal',
  });
}

// Get all upcoming odds
export async function getAllOdds() {
  const results = [];
  for (const sport of SPORTS) {
    const data = await getOddsForSport(sport);
    if (data) results.push(...data);
  }
  return results;
}

// Find odds for specific teams
export async function findMatchOdds(team1, team2) {
  const allOdds = await getAllOdds();
  if (!allOdds) return null;

  const t1 = team1.toLowerCase();
  const t2 = team2.toLowerCase();

  return allOdds.find((game) => {
    const home = game.home_team.toLowerCase();
    const away = game.away_team.toLowerCase();
    return (
      (home.includes(t1) || home.includes(t2)) &&
      (away.includes(t1) || away.includes(t2))
    );
  });
}

// Format odds into clean display
export function formatOdds(oddsData) {
  if (!oddsData || !oddsData.bookmakers) return null;

  const results = {};

  for (const bm of oddsData.bookmakers) {
    const name = BOOKMAKERS[bm.key] || bm.title;
    const h2h = bm.markets.find((m) => m.key === 'h2h');
    if (!h2h) continue;

    const home = h2h.outcomes.find((o) => o.name === oddsData.home_team);
    const away = h2h.outcomes.find((o) => o.name === oddsData.away_team);
    const draw = h2h.outcomes.find((o) => o.name === 'Draw');

    results[name] = {
      home: home?.price?.toFixed(2) || 'N/A',
      draw: draw?.price?.toFixed(2) || 'N/A',
      away: away?.price?.toFixed(2) || 'N/A',
    };
  }

  return results;
}

export { cache as oddsCache };
