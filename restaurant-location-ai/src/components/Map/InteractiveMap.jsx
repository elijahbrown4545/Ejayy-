import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverallScore } from '../../lib/scoring';
import { generateDemandPoints } from '../../lib/expansion';

const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = '&copy; Esri';

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

function MapController({ flyTo }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (flyTo && flyTo !== prev.current) {
      prev.current = flyTo;
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 13, { duration: 1.5 });
    }
  }, [flyTo, map]);
  return null;
}

export default function InteractiveMap({
  locations,
  showHeatmap,
  selectedIds = [],
  onSelectLocation,
  flyTo,
  recommendations = [],
}) {
  const demandPoints = showHeatmap ? generateDemandPoints(locations) : [];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-100">
      <MapContainer
        center={[41.5868, -87.4]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution={SATELLITE_ATTRIBUTION} url={SATELLITE_URL} />
        <MapController flyTo={flyTo} />

        {/* Demand heatmap circles */}
        {showHeatmap &&
          demandPoints.map((pt, idx) => (
            <CircleMarker
              key={`demand-${idx}`}
              center={[pt.lat, pt.lng]}
              radius={50}
              fillColor="#f97316"
              fillOpacity={Math.min(pt.intensity * 0.4, 0.6)}
              color="#f97316"
              weight={0}
            />
          ))}

        {/* AI expansion recommendation markers */}
        {recommendations.map((rec, idx) => (
          <CircleMarker
            key={`rec-${idx}`}
            center={[rec.lat, rec.lng]}
            radius={14}
            fillColor="#8b5cf6"
            fillOpacity={0.8}
            color="#6d28d9"
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 200 }}>
                <p style={{ fontWeight: 700, margin: '0 0 5px', fontSize: 13, color: '#7c3aed' }}>
                  AI Site Recommendation #{idx + 1}
                </p>
                <span style={{
                  background: '#8b5cf6', color: 'white',
                  padding: '2px 10px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 8,
                }}>
                  Score: {rec.score} / 100
                </span>
                <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>
                  <strong>{rec.distanceToNearest.toFixed(1)} mi</strong> from {rec.nearestStore}
                </p>
                <p style={{ fontSize: 11, color: '#777', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                  {rec.reasoning}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Your location markers */}
        {locations.map((loc) => {
          const score = computeOverallScore(loc);
          const color = scoreColor(score);
          const selected = selectedIds.includes(loc.id);
          const auvDisplay =
            loc.avg_unit_volume && loc.avg_unit_volume > 0
              ? `$${(loc.avg_unit_volume / 1_000_000).toFixed(2)}M`
              : null;

          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={selected ? 22 : 16}
              fillColor={color}
              fillOpacity={0.9}
              color={selected ? '#f97316' : 'white'}
              weight={selected ? 3 : 2}
              eventHandlers={{ click: () => onSelectLocation?.(loc) }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 190 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 3px', fontSize: 14 }}>{loc.name}</p>
                  <p style={{ color: '#777', fontSize: 12, margin: '0 0 8px' }}>
                    {loc.address}, {loc.city}
                  </p>
                  <span style={{
                    background: color, color: 'white',
                    padding: '2px 10px', borderRadius: 999,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    Score: {score}
                  </span>
                  {auvDisplay && (
                    <p style={{ fontSize: 12, color: '#555', margin: '6px 0 0' }}>
                      <strong>AUV:</strong> {auvDisplay}
                    </p>
                  )}
                  {loc.monthly_rent && (
                    <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>
                      ${loc.monthly_rent.toLocaleString()}/mo &middot;{' '}
                      {loc.square_footage?.toLocaleString() ?? '—'} sq ft
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
