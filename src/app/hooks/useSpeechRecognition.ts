import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.addEventListener('result', (event) => {
      const e = event as SpeechRecognitionEvent;
      let interim = '';
      let final = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    });

    recognitionRef.current.addEventListener('start', () => {
      setIsListening(true);
      setError(null);
      startTimeRef.current = Date.now();
    });

    recognitionRef.current.addEventListener('end', () => {
      setIsListening(false);
      setInterimTranscript('');
    });

    recognitionRef.current.addEventListener('error', (event) => {
      const e = event as SpeechRecognitionErrorEvent;
      console.error('Speech recognition error:', e.error);
      setError(e.error);
      setIsListening(false);
    });

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        setError('not-allowed');
        return;
      }
      
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        console.error('Error starting recognition:', error);
        // If already started, ignore the error
        if (error.message && error.message.includes('already started')) {
          return;
        }
        setError('not-allowed');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const getDuration = () => {
    if (startTimeRef.current === 0) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    getDuration,
  };
};