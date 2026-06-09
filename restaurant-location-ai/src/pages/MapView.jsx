import { useState, useCallback } from 'react';
import { Layers, Loader2, Search, TrendingUp, Plus } from 'lucide-react';
import InteractiveMap from '../components/Map/InteractiveMap';
import LocationDetailPanel from '../components/Map/LocationDetailPanel';
import LocationForm from '../components/Locations/LocationForm';
import QuickAddModal from '../components/Map/QuickAddModal';
import { useLocations } from '../hooks/useLocations';
import { generateExpansionRecommendations } from '../lib/expansion';
import clsx from 'clsx';

export default function MapView() {
  const { locations, addLocation, updateLocation, deleteLocation } = useLocations();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null);   // { lat, lng } from right-click
  const [editTarget, setEditTarget] = useState(null); // location being edited in full form
  const [saving, setSaving] = useState(false);

  const recommendations = showAI ? generateExpansionRecommendations(locations) : [];

  // --- Search ---
  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      setSearchResults(await res.json());
    } catch {}
    setSearching(false);
  }, [searchQuery]);

  const pickResult = (r) => {
    setFlyTo({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), zoom: 14 });
    setSearchQuery(r.display_name.split(',').slice(0, 3).join(', '));
    setSearchResults([]);
  };

  // --- Quick add from right-click ---
  const handleQuickSave = async (data) => {
    setSaving(true);
    await addLocation(data);
    setSaving(false);
    setQuickAdd(null);
  };

  // --- Full-form edit/save ---
  const handleFullSave = async (data) => {
    setSaving(true);
    if (editTarget?.id) {
      await updateLocation(editTarget.id, data);
      // refresh selected panel if it was the edited one
      if (selectedLocation?.id === editTarget.id) {
        setSelectedLocation({ ...selectedLocation, ...data });
      }
    } else {
      await addLocation(data);
    }
    setSaving(false);
    setEditTarget(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this location?')) return;
    await deleteLocation(id);
    setSelectedLocation(null);
  };

  const handleSelectLocation = (loc) => {
    setSelectedLocation(prev => prev?.id === loc.id ? null : loc);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 space-y-2.5 relative z-10">
        {/* Search row */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search city, intersection, or address — e.g. Merrillville IN or US-30 &amp; Broadway…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              onFocus={() => {}}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <button
            onClick={runSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
          </button>

          {/* Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-14 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate">
                  {r.display_name}
                </button>
              ))}
              <button onClick={() => setSearchResults([])}
                className="w-full px-4 py-2 text-xs text-gray-400 hover:bg-gray-50">
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 mr-auto">
            {locations.length} store{locations.length !== 1 ? 's' : ''} · Right-click map to add a site
          </span>

          {/* Legend */}
          <span className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mr-2">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Strong</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />Average</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Weak</span>
            {showAI && <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />AI Pick</span>}
          </span>

          <button
            onClick={() => setShowAI(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              showAI ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            AI Sites {showAI && recommendations.length > 0 ? `(${recommendations.length})` : ''}
          </button>

          <button
            onClick={() => setShowHeatmap(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              showHeatmap ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Heatmap
          </button>

          <button
            onClick={() => setEditTarget({})}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 p-3">
          <InteractiveMap
            locations={locations}
            showHeatmap={showHeatmap}
            selectedIds={selectedLocation ? [selectedLocation.id] : []}
            onSelectLocation={handleSelectLocation}
            flyTo={flyTo}
            recommendations={recommendations}
            onRightClick={setQuickAdd}
          />
        </div>

        {/* Detail panel — replaces generic list, shows on selection */}
        {selectedLocation ? (
          <LocationDetailPanel
            location={selectedLocation}
            onEdit={loc => { setEditTarget(loc); }}
            onDelete={handleDelete}
            onClose={() => setSelectedLocation(null)}
          />
        ) : (
          /* Collapsed sidebar: show AI recs list if no selection */
          showAI && recommendations.length > 0 && (
            <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden hidden lg:flex">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  AI Recommended Sites
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
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
            </div>
          )
        )}
      </div>

      {/* Right-click quick add */}
      {quickAdd && (
        <QuickAddModal
          lat={quickAdd.lat}
          lng={quickAdd.lng}
          onSave={handleQuickSave}
          onCancel={() => setQuickAdd(null)}
        />
      )}

      {/* Full edit form */}
      {editTarget !== null && (
        <LocationForm
          initial={editTarget?.id ? editTarget : null}
          onSubmit={handleFullSave}
          onCancel={() => setEditTarget(null)}
          loading={saving}
        />
      )}
    </div>
  );
}
