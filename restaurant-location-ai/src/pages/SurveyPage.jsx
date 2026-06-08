import { useState } from 'react';
import { ClipboardList, List, PlusCircle, Loader2, Star } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { useSurveys } from '../hooks/useSurveys';
import SurveyForm from '../components/Survey/SurveyForm';

function SurveyCard({ survey, locationName }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {survey.respondent_name || 'Anonymous'}
          </p>
          <p className="text-xs text-gray-400">{locationName}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < survey.location_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {survey.age_group && (
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{survey.age_group}</span>
        )}
        {survey.visit_frequency && (
          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">{survey.visit_frequency}</span>
        )}
        {survey.would_visit != null && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${survey.would_visit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {survey.would_visit ? 'Would visit' : 'Would not visit'}
          </span>
        )}
        {survey.preferred_cuisine && (
          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{survey.preferred_cuisine}</span>
        )}
      </div>
      {survey.comments && (
        <p className="text-xs text-gray-500 italic line-clamp-2">"{survey.comments}"</p>
      )}
      <p className="text-[10px] text-gray-300 mt-2">
        {new Date(survey.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

export default function SurveyPage() {
  const { locations, loading: locLoading } = useLocations();
  const { surveys, loading: survLoading, submitSurvey } = useSurveys();
  const [tab, setTab] = useState('form');
  const [submitting, setSubmitting] = useState(false);

  const locMap = Object.fromEntries(locations.map(l => [l.id, l.name]));

  const handleSubmit = async (data) => {
    setSubmitting(true);
    const result = await submitSurvey(data);
    setSubmitting(false);
    return result;
  };

  const avgRating = surveys.length
    ? (surveys.reduce((s, r) => s + (r.location_rating || 0), 0) / surveys.length).toFixed(1)
    : '—';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-bold text-gray-900">Customer Surveys</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Responses', value: surveys.length },
          { label: 'Avg Rating', value: `${avgRating} / 5` },
          { label: 'Would Visit', value: `${surveys.filter(s => s.would_visit).length}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-brand-500">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {[['form', PlusCircle, 'Submit Survey'], ['list', List, `Responses (${surveys.length})`]].map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'form' ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7">
          <h2 className="font-semibold text-gray-800 mb-1">Share Your Feedback</h2>
          <p className="text-sm text-gray-400 mb-5">Help us find the best restaurant location in your area.</p>
          {locLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : (
            <SurveyForm locations={locations} onSubmit={handleSubmit} loading={submitting} />
          )}
        </div>
      ) : (
        <div>
          {survLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No surveys yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {surveys.map(s => (
                <SurveyCard key={s.id} survey={s} locationName={locMap[s.location_id] || 'Unknown'} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
