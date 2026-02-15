import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import FocusAreas from './pages/FocusAreas';
import FocusAreaDetail from './pages/FocusAreaDetail';
import Timeline from './pages/Timeline';
import Tracking from './pages/Tracking';
import Statistics from './pages/Statistics';
import Gamification from './pages/Gamification';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>LifeTracker</h1>
      </header>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/areas" element={<FocusAreas />} />
          <Route path="/areas/:id" element={<FocusAreaDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/track" element={<Tracking />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="/gamification" element={<Gamification />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
