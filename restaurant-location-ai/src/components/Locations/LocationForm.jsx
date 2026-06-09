import { useState } from 'react';
import { X, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SCORE_LABELS, autoScoresFromAUV } from '../../lib/scoring';

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
      <input type="range" name={name} min={0} max={100} value={value}
        onChange={onChange} className="w-full accent-brand-500 h-2" />
    </div>
  );
}

export default function LocationForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [showScores, setShowScores] = useState(false);
  const [errors, setErrors] = useState({});

  const set = e => {
    const { name, value, type } = e.target;
    const parsed = type === 'range' || type === 'number' ? Number(value) : value;
    setForm(f => ({ ...f, [name]: parsed }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // When AUV changes, auto-apply scores if sliders are still at default
  const handleAUVChange = e => {
    const auv = parseFloat(e.target.value) || 0;
    const isAllDefault =
      form.foot_traffic_score === 50 &&
      form.competition_score === 50 &&
      form.demographics_score === 50 &&
      form.accessibility_score === 50 &&
      form.rent_score === 50;
    setForm(f => ({
      ...f,
      avg_unit_volume: auv || '',
      ...(isAllDefault ? autoScoresFromAUV(auv) : {}),
    }));
  };

  const findCoordinates = async () => {
    const q = [form.address, form.city, form.state].filter(Boolean).join(', ');
    if (!q.trim()) { setGeocodeError('Enter an address or city first.'); return; }
    setGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm(f => ({
          ...f,
          lat: parseFloat(parseFloat(data[0].lat).toFixed(6)),
          lng: parseFloat(parseFloat(data[0].lon).toFixed(6)),
        }));
        setErrors(prev => ({ ...prev, lat: '', lng: '' }));
      } else {
        setGeocodeError('Not found. Try adding city and state.');
      }
    } catch {
      setGeocodeError('Could not look up coordinates. Check your internet.');
    }
    setGeocoding(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Name is required';
    if (!form.city?.trim()) errs.city = 'City is required';
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) errs.lat = 'Enter valid latitude or use auto-fill';
    if (isNaN(lng) || lng < -180 || lng > 180) errs.lng = 'Enter valid longitude or use auto-fill';
    return errs;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      monthly_rent:     form.monthly_rent     ? parseFloat(form.monthly_rent)    : null,
      square_footage:   form.square_footage   ? parseInt(form.square_footage)    : null,
      parking_spaces:   form.parking_spaces   ? parseInt(form.parking_spaces)    : null,
      avg_unit_volume:  form.avg_unit_volume  ? parseFloat(form.avg_unit_volume) : null,
      weekly_customers: form.weekly_customers ? parseInt(form.weekly_customers)  : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Edit Location' : 'Add Location'}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Name + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location Name *">
              <Input name="name" value={form.name} onChange={set}
                placeholder="e.g. Hammond Hohman Ave"
                className={errors.name ? 'border-red-400' : ''} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </Field>
            <Field label="Status">
              <select name="status" value={form.status} onChange={set}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="candidate">Candidate</option>
                <option value="under_review">Under Review</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
          </div>

          {/* Address */}
          <Field label="Street Address">
            <Input name="address" value={form.address} onChange={set} placeholder="123 Main St" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City *">
              <Input name="city" value={form.city} onChange={set}
                placeholder="Hammond"
                className={errors.city ? 'border-red-400' : ''} />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </Field>
            <Field label="State">
              <Input name="state" value={form.state} onChange={set} placeholder="IN" />
            </Field>
          </div>

          {/* Coordinates */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude *">
                <Input name="lat" type="number" step="any" value={form.lat} onChange={set}
                  placeholder="41.6139"
                  className={errors.lat ? 'border-red-400' : ''} />
                {errors.lat && <p className="text-xs text-red-500 mt-1">{errors.lat}</p>}
              </Field>
              <Field label="Longitude *">
                <Input name="lng" type="number" step="any" value={form.lng} onChange={set}
                  placeholder="-87.4992"
                  className={errors.lng ? 'border-red-400' : ''} />
                {errors.lng && <p className="text-xs text-red-500 mt-1">{errors.lng}</p>}
              </Field>
            </div>
            <button type="button" onClick={findCoordinates} disabled={geocoding}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50">
              {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              {geocoding ? 'Finding…' : 'Auto-fill coordinates from address / city'}
            </button>
            {geocodeError && <p className="text-xs text-red-500">{geocodeError}</p>}
          </div>

          {/* Business performance */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Business Performance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual Revenue (AUV) $">
                <Input name="avg_unit_volume" type="number"
                  value={form.avg_unit_volume} onChange={handleAUVChange}
                  placeholder="1200000" />
                <p className="text-xs text-blue-500 mt-1">Scores auto-update from AUV</p>
              </Field>
              <Field label="Weekly Customers">
                <Input name="weekly_customers" type="number"
                  value={form.weekly_customers} onChange={set} placeholder="2000" />
              </Field>
            </div>
            <Field label="Primary Market / Trade Area">
              <Input name="primary_market" type="text"
                value={form.primary_market} onChange={set}
                placeholder="e.g. Hammond, North Side" />
            </Field>
          </div>

          {/* Property */}
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
            <textarea name="notes" value={form.notes} onChange={set} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              placeholder="Observations, anchor stores, traffic notes…" />
          </Field>

          {/* Advanced scoring — collapsed */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowScores(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              <span>Advanced: Scoring Sliders</span>
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
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading} onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {loading ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
