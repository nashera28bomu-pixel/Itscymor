import { searchTeam, getTeamForm, getH2H, getTeamStats } from '../services/footballAPI.js';
import { findMatchOdds, formatOdds } from '../services/oddsAPI.js';
import { getPrediction } from '../services/aiPredictor.js';
import { getEATTime, getEATDate, utcToEAT } from '../utils/time.js';

function parseTeams(params) {
  const vsRegex = /(.+?)\s+vs\s+(.+)/i;
  const match = params.match(vsRegex);
  if (!match) return null;
  return { team1: match[1].trim(), team2: match[2].trim() };
}

function getConfidenceBar(confidence) {
  const bars = { LOW: '🔴', MEDIUM: '🟡', HIGH: '🟢', 'VERY HIGH': '💚' };
  return bars[confidence] || '⚪';
}

function getProbabilityBar(pct) {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export async function predictCommand(sock, msg, ctx, params) {
  const { from } = ctx;

  const teams = parseTeams(params);
  if (!teams) {
    return sock.sendMessage(from, {
      text: `❌ *Wrong format bana!*\n\nUsage: *.predict [Team A] vs [Team B]*\n\nExample:\n.predict Arsenal vs Chelsea\n.predict Kenya vs Uganda\n\n_Powered by Cymor 🤖_`,
    });
  }

  await sock.sendMessage(from, {
    text: `🔮 _Analyzing *${teams.team1}* vs *${teams.team2}*...\nFetching data & running AI... ⏳_`,
  });

  try {
    // Search for both teams
    const [team1Data, team2Data] = await Promise.all([
      searchTeam(teams.team1),
      searchTeam(teams.team2),
    ]);

    const team1 = team1Data?.response?.[0]?.team;
    const team2 = team2Data?.response?.[0]?.team;

    if (!team1 || !team2) {
      return sock.sendMessage(from, {
        text: `❌ *Team not found!*\n\nCould not find:\n${!team1 ? `• ${teams.team1}` : ''}${!team2 ? `\n• ${teams.team2}` : ''}\n\nCheck spelling and try again bana 😅\n\n_Powered by Cymor 🤖_`,
      });
    }

    // Fetch all data in parallel
    const [homeFormData, awayFormData, h2hData, oddsData] = await Promise.all([
      getTeamForm(team1.id, 5),
      getTeamForm(team2.id, 5),
      getH2H(team1.id, team2.id, 10),
      findMatchOdds(teams.team1, teams.team2),
    ]);

    const homeForm = homeFormData?.response || [];
    const awayForm = awayFormData?.response || [];
    const h2h = h2hData?.response || [];
    const formattedOdds = oddsData ? formatOdds(oddsData) : null;

    // Build form strings
    const getFormString = (fixtures, teamId) => {
      return fixtures.slice(0, 5).map((f) => {
        const home = f.teams.home;
        const away = f.teams.away;
        const homeGoals = f.goals.home;
        const awayGoals = f.goals.away;
        const isHome = home.id === teamId;
        const myGoals = isHome ? homeGoals : awayGoals;
        const theirGoals = isHome ? awayGoals : homeGoals;
        if (myGoals > theirGoals) return 'W';
        if (myGoals < theirGoals) return 'L';
        return 'D';
      }).join('');
    };

    const homeFormStr = getFormString(homeForm, team1.id);
    const awayFormStr = getFormString(awayForm, team2.id);

    // Prepare match data for AI
    const matchData = {
      home: team1.name,
      away: team2.name,
      competition: h2h[0]?.league?.name || 'Football Match',
      matchDate: `${getEATDate()} ${getEATTime()} EAT`,
      h2h: h2h.slice(0, 5).map((f) => ({
        date: f.fixture.date,
        home: f.teams.home.name,
        away: f.teams.away.name,
        score: `${f.goals.home}-${f.goals.away}`,
      })),
      homeForm: homeForm.slice(0, 5).map((f) => ({
        opponent: f.teams.home.id === team1.id ? f.teams.away.name : f.teams.home.name,
        score: `${f.goals.home}-${f.goals.away}`,
        result: getFormString([f], team1.id),
      })),
      awayForm: awayForm.slice(0, 5).map((f) => ({
        opponent: f.teams.home.id === team2.id ? f.teams.away.name : f.teams.home.name,
        score: `${f.goals.home}-${f.goals.away}`,
        result: getFormString([f], team2.id),
      })),
      homeStats: { formString: homeFormStr },
      awayStats: { formString: awayFormStr },
      odds: formattedOdds,
    };

    // Get AI prediction
    const prediction = await getPrediction(matchData);

    if (!prediction) {
      return sock.sendMessage(from, {
        text: `❌ *AI Prediction Failed*\n\nClaude API haikujibu bana 😅\nTry again in a moment.\n\n_Powered by Cymor 🤖_`,
      });
    }

    // H2H summary
    let h2hSummary = 'No previous meetings';
    if (h2h.length > 0) {
      let t1Wins = 0, t2Wins = 0, draws = 0;
      for (const f of h2h) {
        const homeWon = f.goals.home > f.goals.away;
        const awayWon = f.goals.away > f.goals.home;
        if (f.teams.home.id === team1.id) {
          if (homeWon) t1Wins++;
          else if (awayWon) t2Wins++;
          else draws++;
        } else {
          if (homeWon) t2Wins++;
          else if (awayWon) t1Wins++;
          else draws++;
        }
      }
      h2hSummary = `${team1.name} ${t1Wins}W | ${draws}D | ${t2Wins}W ${team2.name}`;
    }

    // Format form with emojis
    const formatFormEmoji = (formStr) => {
      return formStr.split('').map((r) => {
        if (r === 'W') return '🟢';
        if (r === 'L') return '🔴';
        return '🟡';
      }).join('');
    };

    // Build odds section
    let oddsSection = '';
    if (formattedOdds && Object.keys(formattedOdds).length > 0) {
      oddsSection = `\n💰 *ODDS COMPARISON*\n`;
      for (const [bm, odds] of Object.entries(formattedOdds)) {
        oddsSection += `${bm}\n`;
        oddsSection += `   🏠 ${odds.home} | 🤝 ${odds.draw} | ✈️ ${odds.away}\n`;
      }
    } else {
      oddsSection = `\n💰 *ODDS:* Not available for this match\n`;
    }

    // Build confidence bar
    const confBar = getConfidenceBar(prediction.confidence);

    const response = `⚽ *CYMOR PREDICTION*
━━━━━━━━━━━━━━━━━━━━━━━━
🏟️ *${team1.name}* vs *${team2.name}*
🏆 ${matchData.competition}
📅 ${getEATDate()} | 🕐 ${getEATTime()} EAT

📊 *WIN PROBABILITY*
🏠 ${team1.name}
${getProbabilityBar(prediction.homeWinPct)} ${prediction.homeWinPct}%

🤝 Draw
${getProbabilityBar(prediction.drawPct)} ${prediction.drawPct}%

✈️ ${team2.name}
${getProbabilityBar(prediction.awayWinPct)} ${prediction.awayWinPct}%

📈 *RECENT FORM (Last 5)*
🏠 ${team1.name}: ${formatFormEmoji(matchData.homeStats.formString)}
✈️ ${team2.name}: ${formatFormEmoji(matchData.awayStats.formString)}

🔄 *HEAD TO HEAD*
${h2hSummary}
${oddsSection}
━━━━━━━━━━━━━━━━━━━━━━━━
🔥 *CYMOR PICK*
✅ *${prediction.recommendation}*
🎯 Predicted Score: ${prediction.predictedScore}
${confBar} Confidence: *${prediction.confidence}*
⚠️ Risk: ${prediction.riskLevel}

💡 *KEY FACTOR*
${prediction.keyFactor}

🧠 *AI ANALYSIS*
${prediction.reasoning}

💎 *VALUE BET*
${prediction.valueBet} @ ${prediction.valueBetOdds}
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Bet Responsibly! 18+
_Powered by Cymor 🤖_`;

    await sock.sendMessage(from, { text: response });
  } catch (err) {
    console.error('Predict command error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Prediction failed*\n\nKuna error fulani bana 😅\nTry again!\n\n_Powered by Cymor 🤖_`,
    });
  }
}
