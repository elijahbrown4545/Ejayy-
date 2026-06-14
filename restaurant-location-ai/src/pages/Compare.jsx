import { useState } from 'react';
import { BarChart3, Plus, X, Loader2 } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import SiteComparison from '../components/Compare/SiteComparison';
import { computeOverallScore, scoreBgColor } from '../lib/scoring';
import clsx from 'clsx';

export default function Compare() {
  const { locations, loading } = useLocations();
  const [selectedIds, setSelectedIds] = useState([]);

  const selected = locations.filter(l => selectedIds.includes(l.id));
  const available = locations.filter(l => !selectedIds.includes(l.id));

  const toggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-bold text-gray-900">Compare Sites</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Select up to 4</span>
      </div>

      {/* Location picker */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Selected ({selected.length}/4)
        </p>

        {/* Selected chips */}
        <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
          {selected.map(loc => {
            const score = computeOverallScore(loc);
            return (
              <div
                key={loc.id}
                className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-xl text-xs font-medium"
              >
                <span>{loc.name}</span>
                <span className={clsx('text-xs font-bold px-1 rounded', scoreBgColor(score))}>{score}</span>
                <button onClick={() => toggle(loc.id)} className="ml-0.5 hover:text-brand-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {selected.length === 0 && (
            <p className="text-xs text-gray-400 italic">No sites selected yet — pick from the list below.</p>
          )}
        </div>

        {/* Available locations */}
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map(loc => {
              const score = computeOverallScore(loc);
              return (
                <button
                  key={loc.id}
                  onClick={() => toggle(loc.id)}
                  disabled={selectedIds.length >= 4}
                  className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3" />
                  {loc.name}
                  <span className={clsx('text-xs font-bold px-1 rounded', scoreBgColor(score))}>{score}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison */}
      <SiteComparison locations={selected} />
    </div>
  );
}
