import axios from 'axios';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function getPrediction(matchData) {
  const {
    home,
    away,
    h2h,
    homeForm,
    awayForm,
    homeStats,
    awayStats,
    odds,
    competition,
    matchDate,
  } = matchData;

  const prompt = `You are Cymor, an expert football analyst AI for Kenyan bettors. Analyze this match and give a detailed prediction.

MATCH: ${home} vs ${away}
COMPETITION: ${competition}
DATE/TIME: ${matchDate} (EAT)

HEAD TO HEAD (Last 10):
${JSON.stringify(h2h, null, 2)}

HOME TEAM FORM (Last 5 - ${home}):
${JSON.stringify(homeForm, null, 2)}

AWAY TEAM FORM (Last 5 - ${away}):
${JSON.stringify(awayForm, null, 2)}

CURRENT ODDS:
${JSON.stringify(odds, null, 2)}

Provide your analysis in this EXACT JSON format (no extra text, pure JSON):
{
  "homeWinPct": <number 0-100>,
  "drawPct": <number 0-100>,
  "awayWinPct": <number 0-100>,
  "recommendation": "<Home Win | Draw | Away Win | Both Teams Score | Over 2.5 | Under 2.5>",
  "confidence": "<LOW | MEDIUM | HIGH | VERY HIGH>",
  "predictedScore": "<e.g. 2-1>",
  "reasoning": "<3-4 sentences explaining why in plain English>",
  "valueBet": "<best value bet option>",
  "valueBetOdds": "<odds for the value bet>",
  "keyFactor": "<single most important factor>",
  "riskLevel": "<LOW | MEDIUM | HIGH>"
}`;

  try {
    const response = await axios.post(
      ANTHROPIC_API,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const text = response.data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('❌ Claude API error:', err.message);
    return null;
  }
}

export async function getDailyPicks(matches) {
  const prompt = `You are Cymor, an expert football tipster for Kenyan bettors. Analyze these matches and pick the TOP 3 best bets for today.

MATCHES WITH DATA:
${JSON.stringify(matches, null, 2)}

Return ONLY this JSON (no extra text):
{
  "picks": [
    {
      "match": "<Home vs Away>",
      "competition": "<league/cup name>",
      "kickoff": "<time in EAT>",
      "recommendation": "<bet type>",
      "confidence": "<LOW|MEDIUM|HIGH|VERY HIGH>",
      "odds": "<decimal odds>",
      "bookmaker": "<recommended bookmaker>",
      "reasoning": "<2 sentences max>",
      "emoji": "<relevant emoji>"
    }
  ],
  "accumulator": {
    "totalOdds": <combined decimal odds>,
    "advice": "<one sentence about the accumulator>"
  },
  "disclaimer": "Bet responsibly. This is not financial advice."
}`;

  try {
    const response = await axios.post(
      ANTHROPIC_API,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const text = response.data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('❌ Claude picks error:', err.message);
    return null;
  }
}
