import { useState } from 'react';
import { Layers, Map as MapIcon, Loader2 } from 'lucide-react';
import InteractiveMap from '../components/Map/InteractiveMap';
import { useLocations } from '../hooks/useLocations';
import { computeOverallScore, scoreBgColor, SCORE_LABELS } from '../lib/scoring';
import clsx from 'clsx';

export default function MapView() {
  const { locations, loading } = useLocations();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-brand-500" />
          <h1 className="font-semibold text-gray-900 text-sm">Interactive Map</h1>
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{locations.length} locations</span>
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
            {showHeatmap ? 'Show Pins' : 'Show Heatmap'}
          </button>
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
          />
        </div>

        {/* Side panel — location list */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden hidden lg:flex">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Candidate Sites
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : (
              locations
                .slice()
                .sort((a, b) => computeOverallScore(b) - computeOverallScore(a))
                .map((loc, idx) => {
                  const score = computeOverallScore(loc);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(selectedLocation?.id === loc.id ? null : loc)}
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
        </div>
      </div>
    </div>
  );
}
