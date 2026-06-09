import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverallScore } from '../../lib/scoring';

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

export default function InteractiveMap({ locations, showHeatmap, selectedIds = [], onSelectLocation }) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-100">
      <MapContainer
        center={[30.2672, -97.7431]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map(loc => {
          const score = computeOverallScore(loc);
          const color = scoreColor(score);
          const selected = selectedIds.includes(loc.id);

          return showHeatmap ? (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={45}
              fillColor={color}
              fillOpacity={0.25}
              color={color}
              weight={0}
            />
          ) : (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={selected ? 22 : 18}
              fillColor={color}
              fillOpacity={0.9}
              color="white"
              weight={selected ? 3 : 2}
              eventHandlers={{ click: () => onSelectLocation?.(loc) }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
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
                  {loc.monthly_rent && (
                    <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
                      ${loc.monthly_rent.toLocaleString()}/mo &middot; {loc.square_footage?.toLocaleString() ?? '—'} sq ft
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
