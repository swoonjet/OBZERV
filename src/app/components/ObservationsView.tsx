import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { MapPin, Clock, Tag, Search, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../utils/storage';
import { Observation } from '../types/observation';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const BASE_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

export function ObservationsView() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');

  useEffect(() => {
    loadObservations();
  }, []);

  const loadObservations = async () => {
    const data = await storage.getObservations();
    setObservations(data);
  };

  const handleInvite = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const url = `${BASE_URL}feed?u=${encodeURIComponent(user.id)}`
    setFeedUrl(url)
    setShowInvite(true)
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(feedUrl)
    toast.success('Link copied!')
  }

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Follow my OBZERV feed',
          text: 'I\'ve been keeping a voice journal. You can follow my observations here:',
          url: feedUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      handleCopyInvite()
    }
  }

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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-light">Your Observations</h1>
            <button
              onClick={handleInvite}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite</span>
            </button>
          </div>

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

      {/* ── Invite Sheet ── */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowInvite(false)}
            />

            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-6 pt-5 pb-10 max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

              <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-1">
                Invite someone
              </p>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                Share a link to your feed — anyone with it can read your observations, no account needed.
              </p>

              {/* URL pill */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <p className="text-xs text-gray-500 font-mono truncate flex-1">{feedUrl}</p>
                <button
                  onClick={handleCopyInvite}
                  className="text-xs font-medium text-black shrink-0 hover:underline"
                >
                  Copy
                </button>
              </div>

              <button
                onClick={handleShareInvite}
                className="w-full bg-black text-white rounded-xl py-3.5 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Share link
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
