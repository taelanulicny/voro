/**
 * Trading Session Utilities
 * 
 * Trading hours: 8:00 AM - 2:00 AM EST/EDT (next day)
 * Market closed: 2:00 AM - 8:00 AM EST/EDT
 * Each trading session is 18 hours long
 */

/**
 * Get the start of the current trading session in ISO string format (UTC)
 * Trading session starts at 8am EST/EDT
 * - If current time is between 8am-2am (next day), returns today's 8am
 * - If current time is between 2am-8am (market closed), returns yesterday's 8am
 */
export function getCurrentTradingSessionStart(): string {
  const now = new Date();
  
  // Get current time in EST/EDT
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  
  const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
  const day = parseInt(estParts.find(p => p.type === 'day')?.value || '1', 10);
  const month = parseInt(estParts.find(p => p.type === 'month')?.value || '1', 10);
  const year = parseInt(estParts.find(p => p.type === 'year')?.value || '2024', 10);
  
  // Determine which session we're in
  let sessionDay: number;
  if (hour >= 2 && hour < 8) {
    // Market closed (2am-8am) - use yesterday's 8am
    sessionDay = day - 1;
  } else if (hour >= 0 && hour < 2) {
    // Still in previous day's session (8am yesterday to 2am today)
    sessionDay = day - 1;
  } else {
    // Normal case: 8am today (8am-11:59pm)
    sessionDay = day;
  }
  
  // Handle month/year rollover
  let sessionMonth = month;
  let sessionYear = year;
  if (sessionDay < 1) {
    sessionDay = new Date(year, month - 1, 0).getDate(); // Last day of previous month
    if (sessionMonth === 1) {
      sessionMonth = 12;
      sessionYear--;
    } else {
      sessionMonth--;
    }
  }
  
  // Create date string for 8am EST/EDT
  const yearStr = String(sessionYear);
  const monthStr = String(sessionMonth).padStart(2, '0');
  const dayStr = String(sessionDay).padStart(2, '0');
  
  // Check if DST applies (rough estimate: March-November)
  const monthNum = sessionMonth;
  const isDST = (monthNum > 3 && monthNum < 11) || 
                (monthNum === 3 && sessionDay >= 10) ||
                (monthNum === 11 && sessionDay < 3);
  const offsetHours = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5
  
  // Create UTC date for 8am EST/EDT
  const utc8am = new Date(Date.UTC(
    sessionYear,
    sessionMonth - 1,
    sessionDay,
    8 + offsetHours, // Add offset to get UTC time
    0, 0, 0
  ));
  
  return utc8am.toISOString();
}

/**
 * Get the start of the previous trading session
 */
export function getPreviousTradingSessionStart(): string {
  const currentStart = new Date(getCurrentTradingSessionStart());
  // Previous session is 18 hours (one trading day) before
  const previous = new Date(currentStart.getTime() - 18 * 60 * 60 * 1000);
  return previous.toISOString();
}

/**
 * Check if market is currently open
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  
  const hours = parseInt(estParts.find(part => part.type === 'hour')?.value || '0', 10);
  
  // Market closed: 2:00 AM - 8:00 AM EST/EDT
  return !(hours >= 2 && hours < 8);
}
