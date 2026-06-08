import { LayoutDashboard, TrendingUp, Users, MapPin, ClipboardList, Star, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useLocations } from '../hooks/useLocations';
import { useSurveys } from '../hooks/useSurveys';
import { computeOverallScore, rankLocations, SCORE_LABELS, scoreBgColor } from '../lib/scoring';
import clsx from 'clsx';

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand:   'bg-brand-50 text-brand-600',
    blue:    'bg-blue-50 text-blue-600',
    green:   'bg-emerald-50 text-emerald-600',
    purple:  'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ScoreDistributionChart({ locations }) {
  const buckets = [
    { name: 'Excellent (80+)', range: [80, 100], color: '#22c55e' },
    { name: 'Good (60-79)',    range: [60, 79],  color: '#f97316' },
    { name: 'Fair (40-59)',    range: [40, 59],  color: '#f59e0b' },
    { name: 'Poor (<40)',      range: [0, 39],   color: '#ef4444' },
  ];
  const data = buckets.map(b => ({
    name: b.name,
    count: locations.filter(l => {
      const s = computeOverallScore(l);
      return s >= b.range[0] && s <= b.range[1];
    }).length,
    color: b.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusChart({ locations }) {
  const counts = locations.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={70}
          innerRadius={35}
          paddingAngle={4}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DimensionChart({ locations }) {
  const keys = Object.keys(SCORE_LABELS);
  const data = keys.map(key => ({
    name: SCORE_LABELS[key].split(' ').slice(0, 2).join(' '),
    avg: locations.length
      ? Math.round(locations.reduce((s, l) => s + (l[key] ?? 50), 0) / locations.length)
      : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="avg" fill="#f97316" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Admin() {
  const { locations, loading: locLoading } = useLocations();
  const { surveys, loading: survLoading } = useSurveys();

  const ranked = rankLocations(locations);
  const avgScore = locations.length
    ? Math.round(locations.reduce((s, l) => s + computeOverallScore(l), 0) / locations.length)
    : 0;
  const wouldVisit = surveys.filter(s => s.would_visit).length;
  const avgRating = surveys.length
    ? (surveys.reduce((s, r) => s + (r.location_rating || 0), 0) / surveys.length).toFixed(1)
    : '—';

  if (locLoading || survLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MapPin}       label="Total Locations" value={locations.length}    sub="in database"             color="brand" />
        <StatCard icon={TrendingUp}   label="Avg Score"       value={avgScore}            sub="composite metric"        color="green" />
        <StatCard icon={ClipboardList} label="Surveys Collected" value={surveys.length}  sub="customer responses"      color="blue" />
        <StatCard icon={Star}         label="Avg Rating"      value={`${avgRating}★`}     sub={`${wouldVisit} would visit`} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Score Distribution</h3>
          <ScoreDistributionChart locations={locations} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Avg by Dimension</h3>
          <DimensionChart locations={locations} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</h3>
          <StatusChart locations={locations} />
        </div>
      </div>

      {/* Top ranked table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Top Ranked Sites</h3>
          <span className="text-xs text-gray-400">by composite score</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left py-2.5 px-5 text-xs font-medium text-gray-400">#</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400">Name</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400">City</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400">Status</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-400">Score</th>
                <th className="text-right py-2.5 px-5 text-xs font-medium text-gray-400">Rent/mo</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 10).map((loc, idx) => {
                const score = computeOverallScore(loc);
                return (
                  <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-5 text-sm font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3 text-sm font-medium text-gray-900">{loc.name}</td>
                    <td className="py-3 px-3 text-sm text-gray-500">{loc.city}, {loc.state}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs capitalize text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {loc.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', scoreBgColor(score))}>
                        {score}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-500 text-right">
                      {loc.monthly_rent ? `$${loc.monthly_rent.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent surveys */}
      {surveys.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Survey Responses</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {surveys.slice(0, 5).map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {s.respondent_name || 'Anonymous'} — {s.preferred_cuisine || 'No cuisine preference'}
                  </p>
                  <p className="text-xs text-gray-400">{s.comments?.slice(0, 60) || 'No comments'}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < s.location_rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
