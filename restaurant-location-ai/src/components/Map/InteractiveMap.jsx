import { useState, useCallback, useRef } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { computeOverallScore, scoreLabel, scoreBgColor } from '../../lib/scoring';
import clsx from 'clsx';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const HEATMAP_LAYER = {
  id: 'locations-heatmap',
  type: 'heatmap',
  paint: {
    'heatmap-weight':    ['interpolate', ['linear'], ['get', 'score'], 0, 0, 100, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0,   'rgba(33,102,172,0)',
      0.2, 'rgba(103,169,207,0.8)',
      0.4, 'rgba(209,229,240,0.9)',
      0.6, 'rgba(253,219,199,0.9)',
      0.8, 'rgba(239,138,98,0.9)',
      1,   'rgba(178,24,43,1)',
    ],
    'heatmap-radius':  ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 50],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 0],
  },
};

const CLUSTER_LAYER = {
  id: 'clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#f97316', 5, '#ea580c', 10, '#c2410c'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40],
    'circle-opacity': 0.85,
  },
};

const CLUSTER_COUNT_LAYER = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 13,
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
  },
  paint: { 'text-color': '#ffffff' },
};

const UNCLUSTERED_LAYER = {
  id: 'unclustered-point',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': ['interpolate', ['linear'], ['get', 'score'],
      0, '#ef4444', 50, '#f97316', 80, '#22c55e'],
    'circle-radius': 10,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
};

function StatusBadge({ status }) {
  const map = {
    candidate:    'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    active:       'bg-green-100 text-green-700',
    rejected:     'bg-red-100 text-red-700',
  };
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize', map[status] || 'bg-gray-100 text-gray-600')}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function InteractiveMap({ locations, showHeatmap, selectedIds = [], onSelectLocation }) {
  const [popup, setPopup] = useState(null);
  const mapRef = useRef(null);

  const [viewState, setViewState] = useState({
    longitude: -97.7431,
    latitude:  30.2672,
    zoom:      11,
  });

  const geojson = {
    type: 'FeatureCollection',
    features: locations.map(loc => ({
      type: 'Feature',
      properties: {
        id:    loc.id,
        name:  loc.name,
        score: computeOverallScore(loc),
      },
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
    })),
  };

  const handleMarkerClick = useCallback((loc, e) => {
    e.originalEvent?.stopPropagation();
    setPopup(loc);
    if (onSelectLocation) onSelectLocation(loc);
  }, [onSelectLocation]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100">
          <div className="text-center p-8 max-w-sm">
            <p className="text-lg font-semibold text-gray-800 mb-2">Mapbox Token Required</p>
            <p className="text-sm text-gray-500">
              Add <code className="bg-gray-200 px-1 rounded">VITE_MAPBOX_TOKEN</code> to your{' '}
              <code className="bg-gray-200 px-1 rounded">.env</code> file to enable the interactive map.
            </p>
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['unclustered-point', 'clusters']}
        onClick={e => {
          const feat = e.features?.[0];
          if (feat?.layer.id === 'unclustered-point') {
            const loc = locations.find(l => l.id === feat.properties.id);
            if (loc) setPopup(loc);
          }
        }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Heatmap + cluster source */}
        <Source
          id="locations"
          type="geojson"
          data={geojson}
          cluster={!showHeatmap}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {showHeatmap ? (
            <Layer {...HEATMAP_LAYER} />
          ) : (
            <>
              <Layer {...CLUSTER_LAYER} />
              <Layer {...CLUSTER_COUNT_LAYER} />
              <Layer {...UNCLUSTERED_LAYER} />
            </>
          )}
        </Source>

        {/* Individual markers for selected/highlighted */}
        {!showHeatmap && locations.map(loc => {
          const score = computeOverallScore(loc);
          const isSelected = selectedIds.includes(loc.id);
          return (
            <Marker
              key={loc.id}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="center"
              onClick={e => handleMarkerClick(loc, e)}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all',
                  'shadow-lg border-2',
                  isSelected ? 'scale-125 border-brand-500' : 'border-white',
                  score >= 75 ? 'bg-emerald-500'
                    : score >= 55 ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
              >
                {score}
              </div>
            </Marker>
          );
        })}

        {/* Popup */}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
            offset={25}
          >
            <div className="p-3 min-w-[200px]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-gray-900 text-sm">{popup.name}</p>
                <StatusBadge status={popup.status} />
              </div>
              <p className="text-xs text-gray-500 mb-2">{popup.address}, {popup.city}</p>
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', scoreBgColor(computeOverallScore(popup)))}>
                  Score: {computeOverallScore(popup)} — {scoreLabel(computeOverallScore(popup))}
                </span>
              </div>
              {popup.monthly_rent && (
                <p className="text-xs text-gray-500 mt-1">
                  ${popup.monthly_rent?.toLocaleString()}/mo · {popup.square_footage?.toLocaleString()} sq ft
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
