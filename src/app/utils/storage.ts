import { Observation } from '../types/observation';

const STORAGE_KEY = 'voice_observations';

export const storage = {
  getObservations: (): Observation[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading observations:', error);
      return [];
    }
  },

  saveObservation: (observation: Observation): void => {
    try {
      const observations = storage.getObservations();
      observations.unshift(observation); // Add to beginning
      localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
    } catch (error) {
      console.error('Error saving observation:', error);
    }
  },

  updateObservation: (id: string, updates: Partial<Observation>): void => {
    try {
      const observations = storage.getObservations();
      const index = observations.findIndex((o) => o.id === id);
      if (index !== -1) {
        observations[index] = { ...observations[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
      }
    } catch (error) {
      console.error('Error updating observation:', error);
    }
  },

  deleteObservation: (id: string): void => {
    try {
      const observations = storage.getObservations();
      const filtered = observations.filter((o) => o.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting observation:', error);
    }
  },
};
