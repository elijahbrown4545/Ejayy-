import { useState, useCallback, useRef } from 'react';
import { Layers, Loader2, Search, TrendingUp, Plus, X } from 'lucide-react';
import InteractiveMap from '../components/Map/InteractiveMap';
import LocationDetailPanel from '../components/Map/LocationDetailPanel';
import LocationForm from '../components/Locations/LocationForm';
import QuickAddModal from '../components/Map/QuickAddModal';
import { useLocations } from '../hooks/useLocations';
import { generateExpansionRecommendations } from '../lib/expansion';
import clsx from 'clsx';

export default function MapView() {
  const { locations, addLocation, updateLocation, deleteLocation } = useLocations();
  const [showHeatmap, setShowHeatmap]     = useState(false);
  const [showAI, setShowAI]               = useState(true);
  const [showAIList, setShowAIList]       = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [flyTo, setFlyTo]                 = useState(null);
  const [quickAdd, setQuickAdd]           = useState(null);
  const [editTarget, setEditTarget]       = useState(null);
  const [saving, setSaving]               = useState(false);
  const searchRef = useRef(null);

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

  // --- Saves ---
  const handleQuickSave = async (data) => {
    setSaving(true);
    await addLocation(data);
    setSaving(false);
    setQuickAdd(null);
  };

  const handleFullSave = async (data) => {
    setSaving(true);
    if (editTarget?.id) {
      await updateLocation(editTarget.id, data);
      if (selectedLocation?.id === editTarget.id)
        setSelectedLocation(prev => ({ ...prev, ...data }));
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

  return (
    /* Map fills the entire parent (Layout's absolute inset-0) */
    <div className="relative w-full h-full">

      {/* ── MAP (behind everything) ── */}
      <InteractiveMap
        locations={locations}
        showHeatmap={showHeatmap}
        selectedIds={selectedLocation ? [selectedLocation.id] : []}
        onSelectLocation={loc =>
          setSelectedLocation(prev => prev?.id === loc.id ? null : loc)
        }
        flyTo={flyTo}
        recommendations={recommendations}
        onRightClick={setQuickAdd}
      />

      {/* ── FLOATING SEARCH BAR — top center ── */}
      <div
        ref={searchRef}
        className="absolute top-4 left-4 right-4 z-[800] flex gap-2 max-w-xl mx-auto"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 2rem)', maxWidth: '560px' }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search city, intersection, or address…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            className="w-full pl-9 pr-3 py-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={runSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-4 py-3 bg-brand-500 text-white rounded-2xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 shadow-xl transition-colors shrink-0"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
        </button>

        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-12 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-[900]">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate">
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

      {/* ── FLOATING CONTROL BUTTONS — top right ── */}
      <div className="absolute top-4 right-4 z-[800] flex flex-col gap-2">
        <button
          onClick={() => setShowAI(v => !v)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all',
            showAI ? 'bg-purple-600 text-white' : 'bg-white/95 backdrop-blur-md text-gray-700 hover:bg-white'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          <span>AI Sites {showAI && recommendations.length > 0 ? `(${recommendations.length})` : ''}</span>
        </button>

        <button
          onClick={() => setShowHeatmap(v => !v)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all',
            showHeatmap ? 'bg-brand-500 text-white' : 'bg-white/95 backdrop-blur-md text-gray-700 hover:bg-white'
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Heatmap</span>
        </button>

        <button
          onClick={() => setEditTarget({})}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg bg-white/95 backdrop-blur-md text-gray-700 hover:bg-white transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Store</span>
        </button>

        {showAI && recommendations.length > 0 && (
          <button
            onClick={() => setShowAIList(v => !v)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{showAIList ? 'Hide List' : 'View List'}</span>
          </button>
        )}
      </div>

      {/* ── LEGEND — bottom left, above nav ── */}
      <div className="absolute bottom-20 left-4 z-[800] bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 px-3 py-2.5 flex flex-col gap-1.5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Score</p>
        <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />Strong (≥75)</span>
        <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />Average (55-74)</span>
        <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />Weak (&lt;55)</span>
        {showAI && <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />AI Pick</span>}
        <p className="text-xs text-gray-400 mt-1 border-t border-gray-100 pt-1">Right-click map to add</p>
      </div>

      {/* ── LOCATION DETAIL PANEL — right side, slides in ── */}
      <div className={clsx(
        'absolute top-4 right-4 bottom-20 z-[850] transition-all duration-300',
        selectedLocation ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4 pointer-events-none'
      )}>
        {selectedLocation && (
          <div className="h-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <LocationDetailPanel
              location={selectedLocation}
              onEdit={loc => setEditTarget(loc)}
              onDelete={handleDelete}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}
      </div>

      {/* ── AI RECOMMENDATIONS LIST — right side, when no location selected ── */}
      {showAI && showAIList && !selectedLocation && recommendations.length > 0 && (
        <div className="absolute top-4 right-4 bottom-20 w-72 z-[840]">
          <div className="h-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                AI Recommended Sites
              </p>
              <button onClick={() => setShowAIList(false)} className="p-1 rounded hover:bg-purple-100">
                <X className="w-3.5 h-3.5 text-purple-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recommendations.map((rec, idx) => (
                <button key={idx}
                  onClick={() => { setFlyTo({ lat: rec.lat, lng: rec.lng, zoom: 14 }); setShowAIList(false); }}
                  className="w-full text-left px-4 py-3.5 border-b border-purple-50 hover:bg-purple-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-purple-700">
                        {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {rec.distanceToNearest.toFixed(1)} mi · {rec.nearestStore}
                      </p>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold bg-purple-100 text-purple-700 shrink-0">
                      {rec.score}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {quickAdd && (
        <QuickAddModal lat={quickAdd.lat} lng={quickAdd.lng}
          onSave={handleQuickSave} onCancel={() => setQuickAdd(null)} />
      )}
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
