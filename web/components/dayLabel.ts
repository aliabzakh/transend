const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Sat 11-21" for a YYYY-MM-DD day. Shared by the forecast chart (client) and table (server). */
export const dayLabel = (day: string) => `${DOW[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${day.slice(5)}`;
