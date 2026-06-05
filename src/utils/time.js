// All times displayed in EAT (East Africa Time, UTC+3)

export function getEATTime() {
  return new Date().toLocaleTimeString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getEATDate() {
  return new Date().toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getEATShortDate() {
  return new Date().toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Convert UTC timestamp to EAT readable string
export function utcToEAT(utcTimestamp) {
  const date = new Date(utcTimestamp * 1000);
  return date.toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Get time only in EAT
export function utcToEATTime(utcTimestamp) {
  const date = new Date(utcTimestamp * 1000);
  return date.toLocaleTimeString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Get date string for API calls (YYYY-MM-DD in EAT)
export function getAPIDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Africa/Nairobi',
  }); // en-CA gives YYYY-MM-DD format
}

// Get weekend dates (Saturday and Sunday)
export function getWeekendDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek);
  const daysUntilSun = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);

  const sat = new Date(today);
  sat.setDate(today.getDate() + daysUntilSat);

  const sun = new Date(today);
  sun.setDate(today.getDate() + daysUntilSun);

  return {
    saturday: sat.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }),
    sunday: sun.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }),
  };
}

// Format match time for display
export function formatMatchTime(fixture) {
  const timestamp = fixture?.fixture?.timestamp;
  if (!timestamp) return 'TBD';
  return utcToEATTime(timestamp);
}

// Get status emoji
export function getStatusEmoji(status) {
  const statusMap = {
    'NS': '⏰',    // Not Started
    '1H': '🔴',   // First Half
    'HT': '⏸️',   // Half Time
    '2H': '🔴',   // Second Half
    'ET': '⏱️',   // Extra Time
    'P': '🥅',    // Penalty
    'FT': '✅',   // Full Time
    'AET': '✅',  // After Extra Time
    'PEN': '✅',  // After Penalties
    'SUSP': '⏸️', // Suspended
    'INT': '⏸️',  // Interrupted
    'PST': '📅',  // Postponed
    'CANC': '❌', // Cancelled
    'ABD': '❌',  // Abandoned
    'AWD': '🏆',  // Awarded
    'WO': '🏆',   // Walk Over
    'LIVE': '🔴', // Live
  };
  return statusMap[status] || '⚽';
}

// Get competition flag/emoji
export function getLeagueEmoji(leagueId) {
  const leagueEmojis = {
    39: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',   // EPL
    140: '🇪🇸',  // La Liga
    135: '🇮🇹',  // Serie A
    78: '🇩🇪',   // Bundesliga
    61: '🇫🇷',   // Ligue 1
    2: '⭐',     // Champions League
    3: '🟠',     // Europa League
    253: '🇺🇸',  // MLS
    1: '🏆',     // FIFA World Cup
    31: '🌍',    // WC Qualifiers
    10: '🤝',    // Friendlies
    6: '🌍',     // AFCON
    29: '🌍',    // AFCON Qualifiers
    5: '🇪🇺',   // UEFA Nations League
    9: '🌎',     // Copa America
  };
  return leagueEmojis[leagueId] || '⚽';
}
