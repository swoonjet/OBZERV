import { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Tag, Clock, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';
import { analyzeObservations } from '../utils/analysis';
import { PatternAnalysis } from '../types/observation';

export function PatternsView() {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);

  useEffect(() => {
    const observations = storage.getObservations();
    const patterns = analyzeObservations(observations);
    setAnalysis(patterns);
  }, []);

  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading patterns...</p>
      </div>
    );
  }

  if (analysis.totalObservations === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 mb-2">No patterns yet</p>
        <p className="text-sm text-gray-500">
          Record more observations to see patterns and insights
        </p>
      </div>
    );
  }

  const maxHourCount = Math.max(
    ...analysis.timeDistribution.map((t) => t.count),
    1
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-light mb-2">Patterns & Insights</h1>
          <p className="text-sm text-gray-500">
            Discover patterns in your observations
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-light">{analysis.totalObservations}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Per Day</span>
            </div>
            <p className="text-2xl font-light">{analysis.averagePerDay}</p>
          </div>
        </motion.div>

        {/* Top Tags */}
        {analysis.topTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-lg p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-gray-700" />
              <h2 className="font-medium text-gray-800">Common Themes</h2>
            </div>
            <div className="space-y-3">
              {analysis.topTags.slice(0, 5).map((item, index) => (
                <div key={item.tag}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.tag}</span>
                    <span className="text-xs text-gray-500">
                      {item.count} {item.count === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(item.count / analysis.topTags[0].count) * 100}%`,
                      }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                      className="bg-black h-2 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Locations */}
        {analysis.topLocations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-700" />
              <h2 className="font-medium text-gray-800">Frequent Locations</h2>
            </div>
            <div className="space-y-2">
              {analysis.topLocations.slice(0, 5).map((item) => (
                <div
                  key={item.location}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {item.location}
                  </span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Time Distribution */}
        {analysis.timeDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-700" />
              <h2 className="font-medium text-gray-800">Time of Day</h2>
            </div>
            <div className="flex items-end justify-between gap-1 h-32">
              {Array.from({ length: 24 }).map((_, hour) => {
                const data = analysis.timeDistribution.find((t) => t.hour === hour);
                const count = data?.count || 0;
                const height = (count / maxHourCount) * 100;

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.5 + hour * 0.02, duration: 0.3 }}
                      className="w-full bg-black rounded-t-sm min-h-[2px]"
                      style={{ height: count === 0 ? '2px' : undefined }}
                    />
                    {hour % 6 === 0 && (
                      <span className="text-[10px] text-gray-400 mt-1">
                        {hour}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Hour of day (0-23)
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
