import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_LOCATIONS } from '../lib/mockData';
import { computeOverallScore } from '../lib/scoring';

const useMock = !import.meta.env.VITE_SUPABASE_URL;

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        const withScores = MOCK_LOCATIONS.map(l => ({
          ...l,
          overall_score: computeOverallScore(l),
        }));
        setLocations(withScores);
        return;
      }
      const { data, error: err } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      const withScores = (data || []).map(l => ({
        ...l,
        overall_score: computeOverallScore(l),
      }));
      setLocations(withScores);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = useCallback(async (location) => {
    if (useMock) {
      const newLoc = {
        ...location,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        overall_score: computeOverallScore(location),
      };
      setLocations(prev => [newLoc, ...prev]);
      return { data: newLoc, error: null };
    }
    const { data, error: err } = await supabase
      .from('locations')
      .insert([location])
      .select()
      .single();
    if (!err) fetchLocations();
    return { data, error: err };
  }, [fetchLocations]);

  const updateLocation = useCallback(async (id, updates) => {
    if (useMock) {
      setLocations(prev =>
        prev.map(l =>
          l.id === id
            ? { ...l, ...updates, overall_score: computeOverallScore({ ...l, ...updates }) }
            : l
        )
      );
      return { error: null };
    }
    const { error: err } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id);
    if (!err) fetchLocations();
    return { error: err };
  }, [fetchLocations]);

  const deleteLocation = useCallback(async (id) => {
    if (useMock) {
      setLocations(prev => prev.filter(l => l.id !== id));
      return { error: null };
    }
    const { error: err } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    if (!err) fetchLocations();
    return { error: err };
  }, [fetchLocations]);

  return { locations, loading, error, refetch: fetchLocations, addLocation, updateLocation, deleteLocation };
}
