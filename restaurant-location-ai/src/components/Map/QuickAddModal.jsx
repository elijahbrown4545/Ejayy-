import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { autoScoresFromAUV } from '../../lib/scoring';

export default function QuickAddModal({ lat, lng, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [auv, setAuv] = useState('');
  const [guests, setGuests] = useState('');
  const [sqft, setSqft] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    const auvNum = parseFloat(auv) || 0;
    onSave({
      name: name.trim(),
      address: '',
      city: '',
      state: '',
      lat,
      lng,
      status: 'candidate',
      ...autoScoresFromAUV(auvNum),
      avg_unit_volume: auvNum || null,
      weekly_customers: parseInt(guests) || null,
      square_footage: parseInt(sqft) || null,
      monthly_rent: null,
      parking_spaces: null,
      notes: '',
      primary_market: '',
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Add Candidate Site</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Site Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Hammond Hohman Ave"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Annual Revenue (AUV)</label>
              <input
                type="number"
                value={auv}
                onChange={e => setAuv(e.target.value)}
                placeholder="e.g. 1200000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Weekly Guests</label>
              <input
                type="number"
                value={guests}
                onChange={e => setGuests(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Square Footage</label>
            <input
              type="number"
              value={sqft}
              onChange={e => setSqft(e.target.value)}
              placeholder="e.g. 2400"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Score is auto-calculated from AUV. Edit the location later for more detail.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
          >
            Add Site
          </button>
        </div>
      </div>
    </div>
  );
}
