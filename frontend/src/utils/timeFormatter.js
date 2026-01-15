/**
 * Format ISO 8601 duration string to human-readable format
 * Examples:
 *   PT1H30M -> "1 hour 30 minutes"
 *   PT45M -> "45 minutes"
 *   PT2H -> "2 hours"
 *   "1 hour 30 minutes" -> "1 hour 30 minutes" (already formatted)
 */
export function formatDuration(duration) {
  if (!duration) return '';

  // If already formatted (contains words), return as-is
  if (/hour|minute|min|hr/i.test(duration)) {
    return duration;
  }

  // Handle ISO 8601 duration format (PT1H30M)
  const iso8601Pattern = /^PT(?:(\d+)H)?(?:(\d+)M)?$/;
  const match = duration.match(iso8601Pattern);

  if (match) {
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;

    const parts = [];
    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    return parts.join(' ') || '0 minutes';
  }

  // If it's just a number, treat as minutes
  const numericValue = parseInt(duration);
  if (!isNaN(numericValue)) {
    if (numericValue >= 60) {
      const hours = Math.floor(numericValue / 60);
      const minutes = numericValue % 60;
      const parts = [];
      if (hours > 0) {
        parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
      }
      if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
      }
      return parts.join(' ');
    }
    return `${numericValue} ${numericValue === 1 ? 'minute' : 'minutes'}`;
  }

  // Fallback: return as-is if we can't parse it
  return duration;
}
