import { Settings as SettingsIcon, Trash2, MapPin, Info } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';

export default function Settings() {
  const { locations } = useLocations();

  const handleReset = () => {
    if (!confirm(`This will delete all ${locations.length} location(s) and restore the 2 NW Indiana samples. Continue?`)) return;
    localStorage.removeItem('ejayy_locations_v2');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <SettingsIcon className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* About */}
      <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">About</h2>
        </div>
        <p className="text-sm text-gray-600">
          Restaurant Development Intelligence Platform — helps you find your next location in Northwest Indiana and beyond.
        </p>
        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
          <li>Satellite map powered by Esri World Imagery</li>
          <li>Geocoding and area search via OpenStreetMap Nominatim</li>
          <li>Competition data via Overpass API (live restaurant counts)</li>
          <li>AI expansion engine uses Haversine demand modeling</li>
          <li>All location data saved locally in your browser</li>
        </ul>
      </section>

      {/* Map default */}
      <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Map Default</h2>
        </div>
        <p className="text-sm text-gray-600">
          The map opens centered on <strong>Northwest Indiana</strong> (Gary / Hammond / Merrillville area) at zoom 11.
          Use the search bar to navigate anywhere — the map remembers your pan/zoom within the session.
        </p>
      </section>

      {/* Data */}
      <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Your Data</h2>
        </div>
        <p className="text-sm text-gray-600">
          You currently have <strong>{locations.length} location{locations.length !== 1 ? 's' : ''}</strong> saved in your browser.
          Data persists across tab switches and page reloads.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Reset to sample locations
        </button>
      </section>
    </div>
  );
}
