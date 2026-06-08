import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { computeOverallScore, SCORE_LABELS, scoreColor, scoreBgColor } from '../../lib/scoring';
import clsx from 'clsx';

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981'];

function RadarComparison({ locations }) {
  const keys = Object.keys(SCORE_LABELS);
  const data = keys.map(key => {
    const row = { metric: SCORE_LABELS[key] };
    locations.forEach(loc => { row[loc.name] = loc[key] ?? 50; });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {locations.map((loc, i) => (
          <Radar
            key={loc.id}
            name={loc.name}
            dataKey={loc.name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ScoreRow({ label, locations }) {
  const max = Math.max(...locations.map(l => l.value));
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2.5 pr-3 text-xs text-gray-500 font-medium w-32">{label}</td>
      {locations.map((l, i) => (
        <td key={i} className="py-2.5 px-2 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className={clsx('text-sm font-bold', l.value >= 75 ? 'text-emerald-600' : l.value >= 55 ? 'text-yellow-600' : 'text-red-500')}>
              {l.value}
            </span>
            <div className="w-full max-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full', l.value === max ? 'bg-brand-500' : 'bg-gray-300')}
                style={{ width: `${l.value}%` }}
              />
            </div>
          </div>
        </td>
      ))}
    </tr>
  );
}

export default function SiteComparison({ locations }) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium mb-1">No sites selected</p>
        <p className="text-sm">Go to Locations and select 2–4 sites to compare.</p>
      </div>
    );
  }

  const scoreKeys = Object.keys(SCORE_LABELS);

  return (
    <div className="space-y-6">
      {/* Overall score banner */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${locations.length}, 1fr)` }}>
        {locations.map((loc, i) => {
          const score = computeOverallScore(loc);
          return (
            <div
              key={loc.id}
              className="bg-white rounded-2xl p-4 border-2 border-gray-100 text-center"
              style={{ borderTopColor: COLORS[i % COLORS.length] }}
            >
              <div
                className="text-4xl font-bold mb-1"
                style={{ color: COLORS[i % COLORS.length] }}
              >
                {score}
              </div>
              <p className="text-xs font-semibold text-gray-800 line-clamp-1">{loc.name}</p>
              <p className="text-xs text-gray-400">{loc.city}, {loc.state}</p>
              <span className={clsx('inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium', scoreBgColor(score))}>
                {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Comparison (Radar)</h3>
        <RadarComparison locations={locations} />
      </div>

      {/* Detailed score table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full px-4">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium">Metric</th>
                {locations.map((loc, i) => (
                  <th key={loc.id} className="py-2.5 px-2 text-center">
                    <span
                      className="text-xs font-semibold truncate block max-w-[80px] mx-auto"
                      style={{ color: COLORS[i % COLORS.length] }}
                    >
                      {loc.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="px-4">
              {scoreKeys.map(key => (
                <ScoreRow
                  key={key}
                  label={SCORE_LABELS[key]}
                  locations={locations.map(loc => ({ id: loc.id, value: loc[key] ?? 50 }))}
                />
              ))}
              <tr className="bg-gray-50">
                <td className="py-3 px-4 text-xs font-bold text-gray-700">Overall Score</td>
                {locations.map((loc, i) => {
                  const score = computeOverallScore(loc);
                  return (
                    <td key={loc.id} className="py-3 px-2 text-center">
                      <span
                        className="text-sm font-bold"
                        style={{ color: COLORS[i % COLORS.length] }}
                      >
                        {score}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation */}
      {locations.length >= 2 && (() => {
        const best = [...locations].sort((a, b) => computeOverallScore(b) - computeOverallScore(a))[0];
        return (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-brand-700 mb-1">AI Recommendation</p>
            <p className="text-sm text-brand-600">
              Based on the composite scoring, <strong>{best.name}</strong> ranks highest with a score of{' '}
              <strong>{computeOverallScore(best)}</strong>. Consider its foot traffic advantage and overall metric balance.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
