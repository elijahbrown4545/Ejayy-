import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import MapView from './pages/MapView';
import Locations from './pages/Locations';
import Compare from './pages/Compare';
import Settings from './pages/Settings';
import { LocationsProvider } from './context/LocationsContext';

export default function App() {
  return (
    <LocationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/map" replace />} />
            <Route path="map" element={<MapView />} />
            <Route path="stores" element={<Locations />} />
            <Route path="compare" element={<Compare />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LocationsProvider>
  );
}
