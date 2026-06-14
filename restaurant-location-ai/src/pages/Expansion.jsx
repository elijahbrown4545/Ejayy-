import { TrendingUp, Loader2, MapPin, Info } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import {
  generateExpansionRecommendations,
  scoreToGrade,
} from '../lib/expansion';

function gradeBg(grade) {
  switch (grade) {
    case 'A': return 'bg-green-100 text-green-800';
    case 'B': return 'bg-blue-100 text-blue-800';
    case 'C': return 'bg-yellow-100 text-yellow-800';
    default:   return 'bg-orange-100 text-orange-800';
  }
}

export default function Expansion() {
  const { locations, loading } = useLocations();

  const hasActiveData = locations.some(
    (l) => l.status === 'active' || (l.avg_unit_volume ?? 0) > 0
  );

  const recommendations = hasActiveData
    ? generateExpansionRecommendations(locations)
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <h1 className="font-bold text-gray-900 text-lg">AI Expansion Engine</h1>
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-1" />}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Ranked site recommendations based on your store portfolio and revenue data.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : !hasActiveData ? (
          <div className="flex flex-col items-center justify-center text-center py-20 space-y-3">
            <TrendingUp className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 max-w-sm">
              Add at least one active restaurant with AUV data to get expansion
              recommendations.
            </p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 space-y-3">
            <MapPin className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 max-w-sm">
              No expansion candidates could be generated from the current data.
              Try adding more active locations.
            </p>
          </div>
        ) : (
          <>
            {/* Recommendation cards */}
            <div className="space-y-4">
              {recommendations.map((rec, idx) => {
                const grade = scoreToGrade(rec.score);
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-6">
                        #{idx + 1}
                      </span>
                      <span
                        className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${gradeBg(grade)}`}
                      >
                        {grade}
                      </span>
                      <div className="flex-1" />
                      <div className="text-right">
                        <span className="text-2xl font-black text-gray-900">
                          {rec.score}
                        </span>
                        <span className="text-xs text-gray-400"> / 100</span>
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
                      </span>
                    </div>

                    {/* Nearest store */}
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Distance to nearest store:</span>{' '}
                      {rec.distanceToNearest.toFixed(1)} miles from {rec.nearestStore}
                    </p>

                    {/* Reasoning */}
                    <p className="text-xs text-gray-400 italic leading-relaxed">
                      {rec.reasoning}
                    </p>

                    {/* View on Map label */}
                    <div className="flex items-center gap-1 text-xs text-brand-500 font-medium mt-1">
                      <MapPin className="w-3 h-3" />
                      View on Map
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How This Works */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">How This Works</p>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                The AI analyzes your active restaurant locations and their revenue
                performance. It projects customer demand outward from each location
                based on AUV, identifies geographic gaps in your coverage, and scores
                potential expansion sites by demand potential minus cannibalization
                risk.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
