export async function leaguesCommand(sock, msg, ctx) {
  const { from } = ctx;

  const text = `🏆 *SUPPORTED LEAGUES — CYMOR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 *INTERNATIONAL*
🏆 FIFA World Cup
🌍 FIFA WC Qualifiers
🤝 International Friendlies
🌍 AFCON (Africa Cup of Nations)
🌍 AFCON Qualifiers
🇪🇺 UEFA Nations League
🌎 Copa America
🏅 Olympic Football

🏴󠁧󠁢󠁥󠁮󠁧󠁿 *ENGLAND*
Premier League
FA Cup
EFL Championship

🇪🇸 *SPAIN*
La Liga
Copa del Rey

🇮🇹 *ITALY*
Serie A
Coppa Italia

🇩🇪 *GERMANY*
Bundesliga
DFB Pokal

🇫🇷 *FRANCE*
Ligue 1
Coupe de France

⭐ *UEFA CLUB*
Champions League
Europa League
Conference League

🇺🇸 *USA*
MLS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Usage Examples:*
_.today_ — All today's matches
_.table Premier League_
_.predict Kenya vs Tanzania_
_.predict Arsenal vs Chelsea_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Powered by Cymor 🤖_`;

  await sock.sendMessage(from, { text });
}
