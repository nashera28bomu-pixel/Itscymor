import { getEATTime } from '../utils/time.js';

export async function menuCommand(sock, msg, ctx) {
  const { from, senderNumber } = ctx;
  const time = getEATTime();

  const menu = `╔═══════════════════════════╗
║   ⚽ CYMOR ANALYZER BOT   ║
║      Version 1.0 🤖       ║
╚═══════════════════════════╝

👋 Mambo! Welcome to *Cymor Football Analyzer*
Your Ultimate Football Brain!
🕐 ${time} EAT

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢  *LIVE & FIXTURES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *.live*      » Live scores now 🔴
 *.today*     » Today's matches (EAT)
 *.tomorrow*  » Tomorrow's fixtures
 *.weekend*   » Weekend fixtures 📅

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔮  *PREDICTIONS & ANALYSIS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *.predict*   » Predict a match
 *.picks*     » Best bets today 🔥
 *.h2h*       » Head to head stats
 *.form*      » Team recent form
 *.odds*      » Compare bookmakers

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  *STATS & NEWS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *.form*      » Full team stats
 *.table*     » League standings 🏆
 *.news*      » Latest team news
 *.leagues*   » Supported leagues

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️   *SETTINGS & INFO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *.help*      » How to use Cymor
 *.timezone*  » Confirm EAT zone 🕐
 *.ping*      » Check bot status

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑  *OWNER ONLY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *.broadcast* » Message all users
 *.ban*       » Ban a user
 *.unban*     » Unban a user
 *.botstats*  » Bot usage stats
 *.restart*   » Restart the bot
 *.shutdown*  » Turn off bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *USAGE EXAMPLES:*
 .predict Arsenal vs Chelsea
 .odds Man City vs Liverpool
 .form Barcelona
 .table Premier League

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 All times in EAT (UTC+3)
🌍 Covers EPL, La Liga, UCL,
   Serie A, Bundesliga, Ligue 1,
   MLS, AFCON, *Friendlies* & *FIFA WC*
⚠️  Bet Responsibly!
━━━━━━━━━━━━━━━━━━━━━━━━━━━

      *Powered by Cymor 🤖⚽*
    © 2026 All Rights Reserved`;

  await sock.sendMessage(from, { text: menu });
}
