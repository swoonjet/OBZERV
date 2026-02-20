import { Observation, PatternAnalysis } from '../types/observation';

export const analyzeObservations = (
  observations: Observation[]
): PatternAnalysis => {
  if (observations.length === 0) {
    return {
      topTags: [],
      topLocations: [],
      timeDistribution: [],
      totalObservations: 0,
      averagePerDay: 0,
    };
  }

  // Tag frequency
  const tagCounts = new Map<string, number>();
  observations.forEach((obs) => {
    obs.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Location frequency
  const locationCounts = new Map<string, number>();
  observations.forEach((obs) => {
    if (obs.location?.address) {
      const addr = obs.location.address;
      locationCounts.set(addr, (locationCounts.get(addr) || 0) + 1);
    }
  });
  const topLocations = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Time distribution (by hour)
  const hourCounts = new Map<number, number>();
  observations.forEach((obs) => {
    const hour = new Date(obs.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const timeDistribution = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  // Average per day
  const timestamps = observations.map((o) => o.timestamp);
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);
  const daysDiff = Math.max(
    1,
    (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24)
  );
  const averagePerDay = observations.length / daysDiff;

  return {
    topTags,
    topLocations,
    timeDistribution,
    totalObservations: observations.length,
    averagePerDay: parseFloat(averagePerDay.toFixed(1)),
  };
};

// Extract tags from transcript using simple keyword extraction
export const extractTags = (transcript: string): string[] => {
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'me',
    'him',
    'her',
    'us',
    'them',
  ]);

  const words = transcript
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word));

  // Count word frequency
  const wordCounts = new Map<string, number>();
  words.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  // Get top words as tags
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};
