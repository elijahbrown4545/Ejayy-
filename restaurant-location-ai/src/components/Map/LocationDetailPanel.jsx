import { useEffect, useState } from 'react';
import { X, Edit2, Trash2, TrendingUp, Users, DollarSign, MapPin, Store } from 'lucide-react';
import { computeOverallScore, scoreBgColor, scoreLabel } from '../../lib/scoring';
import { fetchNearbyRestaurants } from '../../lib/overpass';

function Stat({ icon: Icon, label, value, sub }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function LocationDetailPanel({ location, onEdit, onDelete, onClose }) {
  const [competitorCount, setCompetitorCount] = useState(null);
  const [loadingComp, setLoadingComp] = useState(true);
  const score = computeOverallScore(location);

  useEffect(() => {
    setCompetitorCount(null);
    setLoadingComp(true);
    fetchNearbyRestaurants(location.lat, location.lng, 1)
      .then(c => { setCompetitorCount(c); setLoadingComp(false); });
  }, [location.id, location.lat, location.lng]);

  const auvDisplay = location.avg_unit_volume
    ? `$${(location.avg_unit_volume / 1_000_000).toFixed(2)}M`
    : null;
  const weeklyDisplay = location.weekly_customers
    ? location.weekly_customers.toLocaleString()
    : null;
  const rentDisplay = location.monthly_rent
    ? `$${location.monthly_rent.toLocaleString()}/mo`
    : null;
  const sqftDisplay = location.square_footage
    ? `${location.square_footage.toLocaleString()} sq ft`
    : null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-snug">{location.name}</p>
            {(location.city || location.address) && (
              <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {[location.address, location.city, location.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Score badge */}
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${scoreBgColor(score)}`}>
            Score: {score}
          </span>
          <span className="text-xs text-gray-500">{scoreLabel(score)}</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            location.status === 'active' ? 'bg-green-100 text-green-700' :
            location.status === 'candidate' ? 'bg-blue-100 text-blue-700' :
            location.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {location.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-3">
          <Stat icon={TrendingUp} label="Annual Revenue (AUV)" value={auvDisplay} />
          <Stat icon={Users} label="Weekly Guests" value={weeklyDisplay ? `${weeklyDisplay} guests/wk` : null} />
          <Stat icon={DollarSign} label="Monthly Rent" value={rentDisplay} sub={sqftDisplay} />
          <Stat icon={MapPin} label="Primary Market" value={location.primary_market} />
        </div>

        {/* Competition — live from OpenStreetMap */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-xs font-semibold text-gray-600">Nearby Competition</p>
          </div>
          {loadingComp ? (
            <p className="text-xs text-gray-400">Fetching from OpenStreetMap…</p>
          ) : competitorCount === null ? (
            <p className="text-xs text-gray-400">Unavailable</p>
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {competitorCount} restaurant{competitorCount !== 1 ? 's' : ''} within 1 mile
            </p>
          )}
        </div>

        {location.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-600 leading-relaxed">{location.notes}</p>
          </div>
        )}

        {/* Coordinates */}
        <p className="text-xs text-gray-300 font-mono">
          {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onEdit(location)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={() => onDelete(location.id)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
