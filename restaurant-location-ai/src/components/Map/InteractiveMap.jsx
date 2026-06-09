import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { computeOverallScore } from '../../lib/scoring';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function InteractiveMap({ locations, showHeatmap, selectedIds = [], onSelectLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // Init map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-97.7431, 30.2672],
        zoom: 11,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
      map.on('load', () => setReady(true));
      map.on('error', e => setError(e.error?.message || String(e.error)));

      mapRef.current = map;
    } catch (e) {
      setError(e.message);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // Update markers / heatmap when data or mode changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Remove old layers/sources
    ['heatmap-layer', 'locations-circles'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ['locations-heat', 'locations-pts'].forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });

    const geojson = {
      type: 'FeatureCollection',
      features: locations.map(loc => ({
        type: 'Feature',
        properties: { score: computeOverallScore(loc) },
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      })),
    };

    if (showHeatmap) {
      map.addSource('locations-heat', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'locations-heat',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1,   'rgb(178,24,43)',
          ],
          'heatmap-radius': 40,
          'heatmap-opacity': 0.8,
        },
      });
    } else {
      locations.forEach(loc => {
        const score = computeOverallScore(loc);
        const bg = score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
        const isSelected = selectedIds.includes(loc.id);

        const el = document.createElement('div');
        Object.assign(el.style, {
          width: isSelected ? '44px' : '36px',
          height: isSelected ? '44px' : '36px',
          borderRadius: '50%',
          background: bg,
          border: isSelected ? '3px solid #f97316' : '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.15s',
        });
        el.textContent = score;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding:12px;min-width:190px;font-family:system-ui,sans-serif;">
            <p style="font-weight:700;margin:0 0 3px;font-size:14px;color:#111;">${loc.name}</p>
            <p style="color:#777;font-size:12px;margin:0 0 8px;">${loc.address}, ${loc.city}</p>
            <span style="background:${bg};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">
              Score: ${score}
            </span>
            ${loc.monthly_rent ? `<p style="font-size:11px;color:#999;margin:6px 0 0;">$${loc.monthly_rent.toLocaleString()}/mo · ${loc.square_footage?.toLocaleString() ?? '—'} sq ft</p>` : ''}
          </div>
        `);

        el.addEventListener('click', () => onSelectLocation?.(loc));

        const marker = new mapboxgl.Marker(el)
          .setLngLat([loc.lng, loc.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [ready, locations, showHeatmap, selectedIds, onSelectLocation]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="text-center p-8 max-w-sm">
          <p className="text-lg font-semibold text-gray-800 mb-2">Mapbox Token Required</p>
          <p className="text-sm text-gray-500">
            Add <code className="bg-gray-200 px-1 rounded">VITE_MAPBOX_TOKEN</code> to your{' '}
            <code className="bg-gray-200 px-1 rounded">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-50 rounded-xl p-8">
          <div className="text-center max-w-md">
            <p className="text-lg font-semibold text-red-700 mb-2">Map Error</p>
            <p className="text-sm text-red-600 font-mono break-all">{error}</p>
            <p className="text-xs text-gray-500 mt-3">Check your Mapbox token is valid with no URL restrictions.</p>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
