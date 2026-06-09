import { useState, useCallback, useRef } from 'react';
import { Layers, Map as MapIcon, Loader2, Search, TrendingUp } from 'lucide-react';
import InteractiveMap from '../components/Map/InteractiveMap';
import { useLocations } from '../hooks/useLocations';
import { computeOverallScore, scoreBgColor } from '../lib/scoring';
import { generateExpansionRecommendations } from '../lib/expansion';
import clsx from 'clsx';

export default function MapView() {
  const { locations, loading } = useLocations();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const searchRef = useRef(null);

  const recommendations = showAI ? generateExpansionRecommendations(locations) : [];

  const runSearch = useCallback(async (q) => {
    const query = (q ?? searchQuery).trim();
    if (!query) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {}
    setSearching(false);
  }, [searchQuery]);

  const pickResult = (r) => {
    setFlyTo({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), zoom: 14 });
    setSearchQuery(r.display_name.split(',').slice(0, 3).join(', '));
    setSearchResults([]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 space-y-2.5">
        {/* Row 1: title + toggles */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-brand-500" />
            <h1 className="font-semibold text-gray-900 text-sm">Map</h1>
            {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
            <span className="text-xs text-gray-400">{locations.length} locations</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAI(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                showAI
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              AI Sites {showAI && recommendations.length > 0 ? `(${recommendations.length})` : ''}
            </button>
            <button
              onClick={() => setShowHeatmap(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                showHeatmap
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Heatmap
            </button>
          </div>
        </div>

        {/* Row 2: search */}
        <div className="relative" ref={searchRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any city, neighborhood, or address…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <button
              onClick={() => runSearch()}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
            </button>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-12 z-[9999] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Score ≥75
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> Score 55-74
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Score &lt;55
          </span>
          {showAI && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-purple-500" /> AI Recommended
            </span>
          )}
        </div>
      </div>

      {/* Map + side panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-3">
          <InteractiveMap
            locations={locations}
            showHeatmap={showHeatmap}
            selectedIds={selectedLocation ? [selectedLocation.id] : []}
            onSelectLocation={setSelectedLocation}
            flyTo={flyTo}
            recommendations={recommendations}
          />
        </div>

        {/* Side panel */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden hidden lg:flex">
          {/* Your locations */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Locations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {locations.length === 0 ? (
              <p className="text-xs text-gray-400 p-4 text-center">
                No locations yet. Go to Locations to add one.
              </p>
            ) : (
              locations
                .slice()
                .sort((a, b) => computeOverallScore(b) - computeOverallScore(a))
                .map((loc, idx) => {
                  const score = computeOverallScore(loc);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocation(loc.id === selectedLocation?.id ? null : loc);
                        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 15 });
                      }}
                      className={clsx(
                        'w-full text-left px-4 py-3 border-b border-gray-50 transition-colors',
                        selectedLocation?.id === loc.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{loc.name}</p>
                          <p className="text-xs text-gray-400 truncate">{loc.city}, {loc.state}</p>
                        </div>
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded-md font-bold', scoreBgColor(score))}>
                          {score}
                        </span>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          {/* AI recommended sites in sidebar */}
          {showAI && recommendations.length > 0 && (
            <>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-purple-50">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  AI Recommended Sites
                </p>
              </div>
              <div className="overflow-y-auto">
                {recommendations.map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFlyTo({ lat: rec.lat, lng: rec.lng, zoom: 14 })}
                    className="w-full text-left px-4 py-3 border-b border-purple-50 hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-700">
                          {rec.lat.toFixed(3)}, {rec.lng.toFixed(3)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {rec.distanceToNearest.toFixed(1)} mi · {rec.nearestStore}
                        </p>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold bg-purple-100 text-purple-700">
                        {rec.score}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
