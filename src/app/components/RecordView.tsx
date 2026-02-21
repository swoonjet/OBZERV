import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mic, Square, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getCurrentLocation } from '../utils/location';
import { storage } from '../utils/storage';
import { extractTags } from '../utils/analysis';
import { Location } from '../types/observation';
import { toast } from 'sonner';
import obzervLogo from '../../assets/logo.svg';
import { TruchetBackground } from './TruchetBackground';

export function RecordView() {
  const navigate = useNavigate();
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    getDuration,
    getFinalTranscript,
  } = useSpeechRecognition();

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isListening) {
      interval = window.setInterval(() => {
        setRecordingTime(getDuration());
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening, getDuration]);

  useEffect(() => {
    if (error) {
      if (error === 'not-allowed') {
        if (!window.isSecureContext && window.location.protocol !== 'http:') {
          toast.error('Voice recording requires HTTPS. Please use a secure connection.');
        } else {
          toast.error('Microphone access denied. Please allow access in your browser.');
        }
      } else if (error === 'microphone-error') {
        toast.error('Could not access microphone. Please check your device settings.');
      } else {
        toast.error('Microphone error. Please try again.');
      }
    }
  }, [error]);

  const handleStartRecording = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch {
      setCurrentLocation(null);
    } finally {
      setLocationLoading(false);
    }
    startListening();
  };

  const handleStopRecording = async () => {
    const duration = getDuration();
    // Capture via ref before stopListening clears state
    const finalText = getFinalTranscript().trim();
    stopListening();

    if (finalText) {
      const observation = {
        id: crypto.randomUUID(),
        transcript: finalText,
        location: currentLocation || undefined,
        timestamp: Date.now(),
        tags: extractTags(finalText),
        duration,
      };

      try {
        await storage.saveObservation(observation);
        toast.success('Observation saved');
        setTimeout(() => {
          navigate(`/observation/${observation.id}`);
        }, 300);
      } catch (err) {
        console.error('Save error:', err);
        toast.error('Failed to save. Please try again.');
      }
    } else {
      toast.error('Nothing recorded — try again');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center h-screen px-6 text-center">
        <div>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Speech recognition is not supported in your browser.</p>
          <p className="text-sm text-gray-500 mt-2">Please try Chrome, Safari, or Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 pb-24">
      <TruchetBackground />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <img src={obzervLogo} alt="OBZERV" className="w-28 h-28 mx-auto mb-3" />
          <h1 className="text-2xl font-light tracking-widest uppercase mb-1">OBZERV</h1>
          <p className="text-sm text-gray-500">Notice. Record. Reflect.</p>
        </motion.div>

        {/* Microphone Permission Error */}
        {error === 'not-allowed' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">Microphone Access Required</p>
                <p className="text-xs text-red-700 mb-2">
                  Click the microphone icon in your browser's address bar and select "Allow".
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Record Button */}
        <div className="flex flex-col items-center space-y-8">
          <motion.button
            onClick={isListening ? handleStopRecording : handleStartRecording}
            disabled={locationLoading}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 shadow-lg shadow-red-500/50'
                : 'bg-black shadow-lg hover:shadow-xl'
            } ${locationLoading ? 'opacity-50' : ''}`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            {locationLoading ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : isListening ? (
              <Square className="w-12 h-12 text-white" fill="white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}

            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>

          {/* Timer */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-mono text-gray-700"
              >
                {formatTime(recordingTime)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location */}
          {currentLocation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <MapPin className="w-4 h-4" />
              <span className="truncate max-w-xs">
                {currentLocation.address || 'Location captured'}
              </span>
            </motion.div>
          )}

          {/* Live transcript */}
          <AnimatePresence>
            {(transcript || interimTranscript) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-md"
              >
                <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] max-h-[300px] overflow-y-auto">
                  <p className="text-gray-800 leading-relaxed">
                    {transcript}
                    <span className="text-gray-400">{interimTranscript}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isListening && !transcript && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 text-center max-w-xs"
            >
              Tap to start recording your observation
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
