import { useState } from 'react';
import { X, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SCORE_LABELS } from '../../lib/scoring';

const EMPTY = {
  name: '',
  address: '',
  city: '',
  state: '',
  lat: '',
  lng: '',
  status: 'candidate',
  foot_traffic_score:  50,
  competition_score:   50,
  demographics_score:  50,
  accessibility_score: 50,
  rent_score:          50,
  monthly_rent: '',
  square_footage: '',
  parking_spaces: '',
  notes: '',
  avg_unit_volume: '',
  weekly_customers: '',
  primary_market: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent ${className}`}
      {...props}
    />
  );
}

function ScoreSlider({ label, name, value, onChange }) {
  const color = value >= 75 ? '#22c55e' : value >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold" style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        className="w-full accent-brand-500 h-2"
      />
    </div>
  );
}

export default function LocationForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [showScores, setShowScores] = useState(false);

  const set = e => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'range' || type === 'number' ? Number(value) : value }));
  };

  const findCoordinates = async () => {
    const query = [form.address, form.city, form.state].filter(Boolean).join(', ');
    if (!query.trim()) {
      setGeocodeError('Enter an address, city, or state first.');
      return;
    }
    setGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm(f => ({ ...f, lat: parseFloat(data[0].lat).toFixed(6), lng: parseFloat(data[0].lon).toFixed(6) }));
      } else {
        setGeocodeError('Address not found. Try being more specific.');
      }
    } catch {
      setGeocodeError('Could not look up coordinates. Check your connection.');
    }
    setGeocoding(false);
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      monthly_rent:    form.monthly_rent    ? parseFloat(form.monthly_rent)    : null,
      square_footage:  form.square_footage  ? parseInt(form.square_footage)    : null,
      parking_spaces:  form.parking_spaces  ? parseInt(form.parking_spaces)    : null,
      avg_unit_volume: form.avg_unit_volume ? parseFloat(form.avg_unit_volume) : null,
      weekly_customers: form.weekly_customers ? parseInt(form.weekly_customers) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Edit Location' : 'Add Location'}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location Name *">
              <Input name="name" value={form.name} onChange={set} required placeholder="e.g. Hammond Hohman Ave" />
            </Field>
            <Field label="Status">
              <select
                name="status"
                value={form.status}
                onChange={set}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="candidate">Candidate</option>
                <option value="under_review">Under Review</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
          </div>

          <Field label="Address">
            <Input name="address" value={form.address} onChange={set} placeholder="123 Main St" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City *">
              <Input name="city" value={form.city} onChange={set} required placeholder="Hammond" />
            </Field>
            <Field label="State">
              <Input name="state" value={form.state} onChange={set} placeholder="IN" />
            </Field>
          </div>

          {/* Coordinates with auto-find */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude *">
                <Input name="lat" type="number" step="any" value={form.lat} onChange={set} required placeholder="41.6139" />
              </Field>
              <Field label="Longitude *">
                <Input name="lng" type="number" step="any" value={form.lng} onChange={set} required placeholder="-87.4992" />
              </Field>
            </div>
            <button
              type="button"
              onClick={findCoordinates}
              disabled={geocoding}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {geocoding
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <MapPin className="w-3.5 h-3.5" />}
              {geocoding ? 'Finding…' : 'Auto-fill coordinates from address'}
            </button>
            {geocodeError && <p className="text-xs text-red-500">{geocodeError}</p>}
          </div>

          {/* Business performance — primary section */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Business Performance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual Revenue (AUV) $">
                <Input
                  name="avg_unit_volume"
                  type="number"
                  value={form.avg_unit_volume}
                  onChange={set}
                  placeholder="1200000"
                />
              </Field>
              <Field label="Weekly Customers">
                <Input
                  name="weekly_customers"
                  type="number"
                  value={form.weekly_customers}
                  onChange={set}
                  placeholder="2000"
                />
              </Field>
            </div>
            <Field label="Primary Market / Trade Area">
              <Input
                name="primary_market"
                type="text"
                value={form.primary_market}
                onChange={set}
                placeholder="e.g. Hammond, North Side"
              />
            </Field>
          </div>

          {/* Property details */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly Rent ($)">
              <Input name="monthly_rent" type="number" value={form.monthly_rent} onChange={set} placeholder="6000" />
            </Field>
            <Field label="Sq Footage">
              <Input name="square_footage" type="number" value={form.square_footage} onChange={set} placeholder="2000" />
            </Field>
            <Field label="Parking Spots">
              <Input name="parking_spaces" type="number" value={form.parking_spaces} onChange={set} placeholder="20" />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              name="notes"
              value={form.notes}
              onChange={set}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              placeholder="Additional observations…"
            />
          </Field>

          {/* Scoring — collapsed by default */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScores(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <span>Advanced Scoring Dimensions</span>
              {showScores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showScores && (
              <div className="p-4 space-y-3">
                {Object.entries(SCORE_LABELS).map(([key, label]) => (
                  <ScoreSlider key={key} label={label} name={key} value={form[key]} onChange={set} />
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
