import { Location } from '../types/observation';

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Try to get address from reverse geocoding
        try {
          const address = await reverseGeocode(
            location.latitude,
            location.longitude
          );
          location.address = address;
        } catch (error) {
          console.log('Could not get address:', error);
        }

        resolve(location);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string | undefined> => {
  try {
    // Using OpenStreetMap's Nominatim API (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VoiceJournal/1.0',
        },
      }
    );

    if (!response.ok) return undefined;

    const data = await response.json();
    
    // Create a readable address
    const address = data.address;
    const parts = [];
    
    if (address.road) parts.push(address.road);
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    
    return parts.length > 0 ? parts.join(', ') : data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return undefined;
  }
};
