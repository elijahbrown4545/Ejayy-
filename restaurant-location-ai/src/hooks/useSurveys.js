import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_SURVEYS } from '../lib/mockData';

const useMock = !import.meta.env.VITE_SUPABASE_URL;

export function useSurveys(locationId = null) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        const filtered = locationId
          ? MOCK_SURVEYS.filter(s => s.location_id === locationId)
          : MOCK_SURVEYS;
        setSurveys(filtered);
        return;
      }
      let query = supabase.from('surveys').select('*').order('created_at', { ascending: false });
      if (locationId) query = query.eq('location_id', locationId);
      const { data, error: err } = await query;
      if (err) throw err;
      setSurveys(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const submitSurvey = useCallback(async (survey) => {
    if (useMock) {
      const newSurvey = {
        ...survey,
        id: `s${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setSurveys(prev => [newSurvey, ...prev]);
      MOCK_SURVEYS.push(newSurvey);
      return { data: newSurvey, error: null };
    }
    const { data, error: err } = await supabase
      .from('surveys')
      .insert([survey])
      .select()
      .single();
    if (!err) fetchSurveys();
    return { data, error: err };
  }, [fetchSurveys]);

  return { surveys, loading, error, refetch: fetchSurveys, submitSurvey };
}
