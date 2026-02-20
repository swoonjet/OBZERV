import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  MapPin,
  Clock,
  Tag,
  Share2,
  Trash2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';
import { Observation } from '../types/observation';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ObservationDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [observation, setObservation] = useState<Observation | null>(null);

  useEffect(() => {
    if (id) {
      storage.getObservations().then((observations) => {
        const found = observations.find((o) => o.id === id);
        setObservation(found || null);
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (observation && confirm('Delete this observation?')) {
      await storage.deleteObservation(observation.id);
      toast.success('Observation deleted');
      navigate('/observations');
    }
  };

  const handleShare = async () => {
    if (!observation) return;

    const shareText = `${observation.transcript}\n\n${
      observation.location?.address
        ? `Location: ${observation.location.address}\n`
        : ''
    }${format(observation.timestamp, 'PPpp')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Observation',
          text: shareText,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard');
    }
  };

  const openInMaps = () => {
    if (observation?.location) {
      const url = `https://www.google.com/maps?q=${observation.location.latitude},${observation.location.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (!observation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Observation not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <button
            onClick={() => navigate('/observations')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 text-sm text-gray-500 mb-4"
        >
          <Clock className="w-4 h-4" />
          <span>{format(observation.timestamp, 'EEEE, MMMM d, yyyy')}</span>
          <span>•</span>
          <span>{format(observation.timestamp, 'h:mm a')}</span>
        </motion.div>

        {/* Transcript */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-lg p-6 mb-4"
        >
          <p className="text-gray-800 leading-relaxed text-lg whitespace-pre-wrap">
            {observation.transcript}
          </p>
        </motion.div>

        {/* Location */}
        {observation.location && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 rounded-lg p-4 mb-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800 mb-1">Location</p>
                  <p className="text-sm text-gray-600">
                    {observation.location.address || 'Location captured'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {observation.location.latitude.toFixed(6)},{' '}
                    {observation.location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <button
                onClick={openInMaps}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Tags */}
        {observation.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-800 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {observation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Duration */}
        {observation.duration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-center text-sm text-gray-500"
          >
            Recording duration: {observation.duration} seconds
          </motion.div>
        )}
      </div>
    </div>
  );
}
