import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const EMPTY = {
  location_id: '',
  respondent_name: '',
  respondent_email: '',
  age_group: '',
  income_level: '',
  visit_frequency: '',
  preferred_cuisine: '',
  location_rating: 0,
  would_visit: null,
  travel_distance: '',
  comments: '',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({ children, ...props }) {
  return (
    <select
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
      {...props}
    >
      <option value="">Select…</option>
      {children}
    </select>
  );
}

function Input(props) {
  return (
    <input
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
      {...props}
    />
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function SurveyForm({ locations, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const set = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.location_id || !form.visit_frequency || form.location_rating === 0) return;
    const { error } = await onSubmit({
      ...form,
      would_visit: form.would_visit === 'yes',
    });
    if (!error) {
      setSubmitted(true);
      setForm(EMPTY);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
        <p className="text-gray-500 mb-6">Your feedback helps us find the best location.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="px-6 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your Name">
          <Input name="respondent_name" value={form.respondent_name} onChange={set} placeholder="John Doe" />
        </Field>
        <Field label="Email">
          <Input name="respondent_email" type="email" value={form.respondent_email} onChange={set} placeholder="john@example.com" />
        </Field>
      </div>

      <Field label="Location Being Evaluated" required>
        <Select name="location_id" value={form.location_id} onChange={set} required>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Age Group">
          <Select name="age_group" value={form.age_group} onChange={set}>
            {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="Household Income">
          <Select name="income_level" value={form.income_level} onChange={set}>
            <option value="under_30k">Under $30k</option>
            <option value="30k_50k">$30k – $50k</option>
            <option value="50k_75k">$50k – $75k</option>
            <option value="75k_100k">$75k – $100k</option>
            <option value="over_100k">Over $100k</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="How Often Would You Visit?" required>
          <Select name="visit_frequency" value={form.visit_frequency} onChange={set} required>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="rarely">Rarely</option>
          </Select>
        </Field>
        <Field label="Preferred Cuisine">
          <Input name="preferred_cuisine" value={form.preferred_cuisine} onChange={set} placeholder="e.g. Italian, Asian Fusion" />
        </Field>
      </div>

      <Field label="How Far Would You Travel?">
        <Select name="travel_distance" value={form.travel_distance} onChange={set}>
          <option value="0_1mi">Under 1 mile</option>
          <option value="1_3mi">1 – 3 miles</option>
          <option value="3_5mi">3 – 5 miles</option>
          <option value="5_10mi">5 – 10 miles</option>
          <option value="over_10mi">Over 10 miles</option>
        </Select>
      </Field>

      <Field label="Would You Visit This Location?" required>
        <div className="flex gap-3">
          {['yes', 'no'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setForm(f => ({ ...f, would_visit: v }))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                form.would_visit === v
                  ? v === 'yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Rate This Location" required>
        <StarRating value={form.location_rating} onChange={v => setForm(f => ({ ...f, location_rating: v }))} />
      </Field>

      <Field label="Additional Comments">
        <textarea
          name="comments"
          value={form.comments}
          onChange={set}
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
          placeholder="What do you think about this location? Any suggestions?"
        />
      </Field>

      <button
        type="submit"
        disabled={loading || !form.location_id || !form.visit_frequency || form.location_rating === 0}
        className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </form>
  );
}
