import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import MapView from './pages/MapView';
import Locations from './pages/Locations';
import SurveyPage from './pages/SurveyPage';
import Compare from './pages/Compare';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="map" element={<MapView />} />
          <Route path="locations" element={<Locations />} />
          <Route path="survey" element={<SurveyPage />} />
          <Route path="compare" element={<Compare />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
