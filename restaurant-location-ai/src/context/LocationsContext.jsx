import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { computeOverallScore } from '../lib/scoring';

const STORAGE_KEY = 'ejayy_locations_v2';
const LocationsContext = createContext(null);

const SAMPLE = [
  {
    id: 'nwi-1',
    name: 'Hammond - Hohman Ave',
    address: '5246 Hohman Ave',
    city: 'Hammond',
    state: 'IN',
    lat: 41.6139,
    lng: -87.4992,
    status: 'active',
    foot_traffic_score: 72,
    competition_score: 65,
    demographics_score: 68,
    accessibility_score: 75,
    rent_score: 78,
    monthly_rent: 5500,
    square_footage: 2000,
    parking_spaces: 22,
    notes: 'Sample location — edit or delete and add your own.',
    avg_unit_volume: 950000,
    weekly_customers: 1900,
    primary_market: 'Hammond',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'nwi-2',
    name: 'Merrillville - US-30 Corridor',
    address: '1800 E 80th Ave',
    city: 'Merrillville',
    state: 'IN',
    lat: 41.4927,
    lng: -87.3322,
    status: 'active',
    foot_traffic_score: 80,
    competition_score: 58,
    demographics_score: 74,
    accessibility_score: 85,
    rent_score: 70,
    monthly_rent: 6800,
    square_footage: 2400,
    parking_spaces: 40,
    notes: 'Sample — high traffic corridor along US-30.',
    avg_unit_volume: 1250000,
    weekly_customers: 2400,
    primary_market: 'Merrillville',
    created_at: '2025-01-02T00:00:00Z',
  },
];

export function LocationsProvider({ children }) {
  const [locations, setLocations] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0)
          return parsed.map(l => ({ ...l, overall_score: computeOverallScore(l) }));
      }
    } catch {}
    return SAMPLE.map(l => ({ ...l, overall_score: computeOverallScore(l) }));
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  }, [locations]);

  const addLocation = useCallback((location) => {
    const newLoc = {
      ...location,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      overall_score: computeOverallScore(location),
    };
    setLocations(prev => [newLoc, ...prev]);
    return { data: newLoc, error: null };
  }, []);

  const updateLocation = useCallback((id, updates) => {
    setLocations(prev =>
      prev.map(l =>
        l.id === id
          ? { ...l, ...updates, overall_score: computeOverallScore({ ...l, ...updates }) }
          : l
      )
    );
    return { error: null };
  }, []);

  const deleteLocation = useCallback((id) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    return { error: null };
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, loading: false, error: null, addLocation, updateLocation, deleteLocation }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocationsCtx() {
  return useContext(LocationsContext);
}
