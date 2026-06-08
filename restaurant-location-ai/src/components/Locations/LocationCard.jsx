import { MapPin, DollarSign, Maximize2, Car, Star, Trash2, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import { computeOverallScore, scoreColor, scoreBgColor, scoreLabel, SCORE_LABELS, SCORE_WEIGHTS } from '../../lib/scoring';

const STATUS_STYLES = {
  candidate:    'bg-blue-100 text-blue-700 border-blue-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  active:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:     'bg-red-100 text-red-700 border-red-200',
};

function ScoreBar({ value, label }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            value >= 75 ? 'bg-emerald-500' : value >= 55 ? 'bg-yellow-500' : 'bg-red-400'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function LocationCard({ location, onEdit, onDelete, onSelect, selected }) {
  const score = computeOverallScore(location);
  const scoreKeys = Object.keys(SCORE_LABELS);

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border-2 transition-all hover:shadow-md cursor-pointer',
        selected ? 'border-brand-400 shadow-md shadow-brand-100' : 'border-gray-100'
      )}
      onClick={() => onSelect?.(location)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{location.name}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {location.address}, {location.city}
            </p>
          </div>
          <span
            className={clsx(
              'text-xs px-2 py-0.5 rounded-full font-medium border capitalize shrink-0',
              STATUS_STYLES[location.status] || 'bg-gray-100 text-gray-600 border-gray-200'
            )}
          >
            {location.status?.replace('_', ' ')}
          </span>
        </div>

        {/* Overall score */}
        <div className="flex items-center gap-3">
          <div className={clsx('text-3xl font-bold', scoreColor(score))}>{score}</div>
          <div>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', scoreBgColor(score))}>
              {scoreLabel(score)}
            </span>
            <p className="text-xs text-gray-400 mt-0.5">Overall Score</p>
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="px-4 pb-3 space-y-2">
        {scoreKeys.map(key => (
          <ScoreBar key={key} value={location[key] ?? 50} label={SCORE_LABELS[key]} />
        ))}
      </div>

      {/* Meta info */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        {location.monthly_rent && (
          <div className="flex flex-col items-center text-center">
            <DollarSign className="w-3.5 h-3.5 text-gray-400 mb-0.5" />
            <span className="text-xs font-medium text-gray-700">
              ${(location.monthly_rent / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] text-gray-400">/ mo</span>
          </div>
        )}
        {location.square_footage && (
          <div className="flex flex-col items-center text-center">
            <Maximize2 className="w-3.5 h-3.5 text-gray-400 mb-0.5" />
            <span className="text-xs font-medium text-gray-700">
              {location.square_footage.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400">sq ft</span>
          </div>
        )}
        {location.parking_spaces != null && (
          <div className="flex flex-col items-center text-center">
            <Car className="w-3.5 h-3.5 text-gray-400 mb-0.5" />
            <span className="text-xs font-medium text-gray-700">{location.parking_spaces}</span>
            <span className="text-[10px] text-gray-400">parking</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex border-t border-gray-100" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <button
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              onClick={() => onEdit(location)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100"
              onClick={() => onDelete(location.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
