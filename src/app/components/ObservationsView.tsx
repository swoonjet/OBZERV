import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { MapPin, Clock, Tag, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';
import { Observation } from '../types/observation';
import { formatDistanceToNow } from 'date-fns';

export function ObservationsView() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadObservations();
  }, []);

  const loadObservations = () => {
    const data = storage.getObservations();
    setObservations(data);
  };

  const filteredObservations = observations.filter((obs) => {
    const query = searchQuery.toLowerCase();
    return (
      obs.transcript.toLowerCase().includes(query) ||
      obs.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      obs.location?.address?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-light mb-4">Your Observations</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search observations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-black outline-none"
            />
          </div>
        </motion.div>

        {/* Observations List */}
        {filteredObservations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? (
              <p>No observations found</p>
            ) : (
              <div>
                <p className="mb-2">No observations yet</p>
                <p className="text-sm">Start recording to capture your first observation</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredObservations.map((observation, index) => (
              <motion.div
                key={observation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/observation/${observation.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Transcript Preview */}
                  <p className="text-gray-800 line-clamp-3 mb-3">
                    {observation.transcript}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(observation.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {observation.location?.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">
                          {observation.location.address}
                        </span>
                      </div>
                    )}

                    {observation.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{observation.tags.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
