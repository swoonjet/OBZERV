export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Observation {
  id: string;
  transcript: string;
  location?: Location;
  timestamp: number;
  tags: string[];
  duration?: number; // in seconds
}

export interface PatternAnalysis {
  topTags: { tag: string; count: number }[];
  topLocations: { location: string; count: number }[];
  timeDistribution: { hour: number; count: number }[];
  totalObservations: number;
  averagePerDay: number;
}
