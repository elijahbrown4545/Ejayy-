import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, Search, Plus, X, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import InteractiveMap from '../components/Map/InteractiveMap';
import LocationDetailPanel from '../components/Map/LocationDetailPanel';
import LocationForm from '../components/Locations/LocationForm';
import QuickAddModal from '../components/Map/QuickAddModal';
import { useLocations } from '../hooks/useLocations';
import { fetchAreaData } from '../lib/overpass';
import { generateHeatGrid, generateScoredRecommendations } from '../lib/siteScore';
import clsx from 'clsx';

// ── Layer toggle item ────────────────────────────────────────────────────────
function LayerToggle({ label, active, onChange, color, description }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div
        onClick={() => onChange(!active)}
        className={clsx(
          'w-10 h-5 rounded-full transition-colors relative shrink-0',
          active ? 'bg-brand-500' : 'bg-gray-200'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          active ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
          {color && <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
          {label}
        </p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </label>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MapView() {
  const { locations, addLocation, updateLocation, deleteLocation } = useLocations();

  // Layer state
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showTerritories, setShowTerritories] = useState(false);
  const [showHeatmap,     setShowHeatmap]     = useState(false);
  const [showAI,          setShowAI]          = useState(true);
  const [layerPanelOpen,  setLayerPanelOpen]  = useState(false);

  // Map state
  const [flyTo,            setFlyTo]            = useState(null);
  const [mapBounds,        setMapBounds]        = useState(null);
  const [areaData,         setAreaData]         = useState(null);
  const [dataLoading,      setDataLoading]      = useState(false);
  const [dataError,        setDataError]        = useState(false);

  // Derived
  const [heatPoints,       setHeatPoints]       = useState([]);
  const [recommendations,  setRecommendations]  = useState([]);

  // UI state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchResults,    setSearchResults]    = useState([]);
  const [searching,        setSearching]        = useState(false);
  const [quickAdd,         setQuickAdd]         = useState(null);
  const [editTarget,       setEditTarget]       = useState(null);
  const [saving,           setSaving]           = useState(false);

  const fetchTimerRef = useRef(null);

  // ── Fetch OSM area data when bounds change ──────────────────────────────────
  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
    clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(async () => {
      setDataLoading(true);
      setDataError(false);
      try {
        const data = await fetchAreaData(bounds);
        setAreaData(data);
      } catch {
        setDataError(true);
      }
      setDataLoading(false);
    }, 800);
  }, []);

  // ── Recompute heatmap — works immediately, gets smarter when Overpass loads ──
  useEffect(() => {
    if (!mapBounds || !showHeatmap) { setHeatPoints([]); return; }
    // areaData may be null — siteScore has a fallback for that case
    const grid = generateHeatGrid(mapBounds, areaData, locations);
    setHeatPoints(grid);
  }, [areaData, mapBounds, locations, showHeatmap]);

  useEffect(() => {
    if (!mapBounds || !showAI) { setRecommendations([]); return; }
    const recs = generateScoredRecommendations(mapBounds, areaData, locations);
    setRecommendations(recs);
  }, [areaData, mapBounds, locations, showAI]);

  // ── Search ──────────────────────────────────────────────────────────────────
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
    setFlyTo({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), zoom: 15 });
    setSearchQuery(r.display_name.split(',').slice(0, 3).join(', '));
    setSearchResults([]);
  };

  // ── Save handlers ───────────────────────────────────────────────────────────
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

  // Competitors = OSM restaurants only (never own stores)
  const competitors = areaData?.restaurants ?? [];

  return (
    <div className="relative w-full h-full">

      {/* ── MAP (fills entire screen) ─────────────────────────────────────── */}
      <InteractiveMap
        locations={locations}
        selectedIds={selectedLocation ? [selectedLocation.id] : []}
        onSelectLocation={loc => setSelectedLocation(p => p?.id === loc.id ? null : loc)}
        flyTo={flyTo}
        onRightClick={setQuickAdd}
        onBoundsChange={handleBoundsChange}
        competitors={competitors}
        heatPoints={heatPoints}
        recommendations={recommendations}
        showCompetitors={showCompetitors}
        showTerritories={showTerritories}
        showHeatmap={showHeatmap}
        showAI={showAI}
      />

      {/* ── FLOATING SEARCH BAR ──────────────────────────────────────────── */}
      <div className="absolute top-4 z-[800]"
        style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(560px, calc(100% - 2rem))' }}>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search city, ZIP, address, or intersection — e.g. US-30 &amp; Mississippi, Merrillville IN…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              className="w-full pl-9 pr-8 py-3 bg-white/97 backdrop-blur-md border border-gray-200 rounded-2xl text-sm shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={runSearch} disabled={searching || !searchQuery.trim()}
            className="px-4 py-3 bg-brand-500 text-white rounded-2xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 shadow-2xl transition-colors shrink-0">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
          </button>
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-14 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-[900]">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate">
                {r.display_name}
              </button>
            ))}
            <button onClick={() => setSearchResults([])}
              className="w-full px-4 py-2 text-xs text-gray-400 hover:bg-gray-50">Dismiss</button>
          </div>
        )}
      </div>

      {/* ── DATA LOADING INDICATOR ───────────────────────────────────────── */}
      {dataLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[800] bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs text-gray-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
          Loading area data from OpenStreetMap…
        </div>
      )}
      {dataError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[800] bg-red-50 border border-red-100 px-4 py-2 rounded-full shadow text-xs text-red-600">
          Could not load area data. Check connection or try again.
        </div>
      )}

      {/* ── TOP-RIGHT CONTROLS ───────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-[800] flex flex-col gap-2">
        {/* Layers panel toggle */}
        <button onClick={() => setLayerPanelOpen(v => !v)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all',
            layerPanelOpen ? 'bg-brand-500 text-white' : 'bg-white/95 backdrop-blur-md text-gray-700 hover:bg-white'
          )}>
          <Layers className="w-4 h-4" />
          Layers
          {layerPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Layers panel */}
        {layerPanelOpen && (
          <div className="bg-white/97 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-4 w-64 space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Map Layers</p>
            <LayerToggle
              label="AI Opportunity Sites"
              active={showAI}
              onChange={setShowAI}
              color="#7c3aed"
              description="Scored expansion recommendations"
            />
            <LayerToggle
              label="Opportunity Heat Map"
              active={showHeatmap}
              onChange={setShowHeatmap}
              color="#f4511e"
              description={areaData ? 'Based on road, retail & demand data' : 'Load area data first'}
            />
            <LayerToggle
              label="Competitors"
              active={showCompetitors}
              onChange={setShowCompetitors}
              color="#9e5a00"
              description={areaData ? `${competitors.length} restaurants in view` : 'Fetching area data…'}
            />
            <LayerToggle
              label="Trade Areas"
              active={showTerritories}
              onChange={setShowTerritories}
              color="#f97316"
              description="1-mile radius around your stores"
            />

            {/* Heatmap legend */}
            {showHeatmap && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Heat Map Scale</p>
                {[
                  { color: '#b71c1c', label: 'Highest Opportunity' },
                  { color: '#f4511e', label: 'Strong' },
                  { color: '#fdd835', label: 'Average' },
                  { color: '#1976d2', label: 'Below Average' },
                  { color: '#0d47a1', label: 'Weak' },
                ].map(({ color, label }) => (
                  <div key={color} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Store button */}
        <button onClick={() => setEditTarget({})}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-lg bg-brand-500 text-white hover:bg-brand-600 transition-all">
          <Plus className="w-4 h-4" />
          Add Store
        </button>
      </div>

      {/* ── LOCATION DETAIL PANEL (slide-in from right) ───────────────────── */}
      <div className={clsx(
        'absolute top-4 right-4 bottom-20 z-[850] transition-all duration-300',
        selectedLocation && !layerPanelOpen
          ? 'w-80 opacity-100 pointer-events-auto'
          : 'w-0 opacity-0 pointer-events-none'
      )}>
        {selectedLocation && !layerPanelOpen && (
          <div className="h-full bg-white/97 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <LocationDetailPanel
              location={selectedLocation}
              onEdit={loc => setEditTarget(loc)}
              onDelete={handleDelete}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}
      </div>

      {/* ── BOTTOM-LEFT LEGEND ──────────────────────────────────────────── */}
      <div className="absolute bottom-20 left-4 z-[800] bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 px-3 py-2.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Stores</p>
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Strong site (≥75)</span>
          <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Average site (55–74)</span>
          <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Weak site (&lt;55)</span>
          {showAI && <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" />AI recommended</span>}
          {showCompetitors && <span className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-800" />Competitor</span>}
        </div>
        <p className="text-xs text-gray-400 mt-2 pt-1.5 border-t border-gray-100">Right-click map to add</p>
      </div>

      {/* ── DATA SOURCE CREDIT ───────────────────────────────────────────── */}
      {areaData && (
        <div className="absolute bottom-20 right-4 z-[800] bg-black/40 backdrop-blur-md text-white/70 text-xs px-2.5 py-1 rounded-lg">
          {competitors.length} restaurants · {areaData.retailers.length} anchors · {areaData.roads.length} road segments via OSM
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
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
