import { useState, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import FocusAreas from './pages/FocusAreas';
import Timeline from './pages/Timeline';
import Tracking from './pages/Tracking';
import Statistics from './pages/Statistics';
import WeekTemplates from './pages/WeekTemplates';
import Modal from './components/Modal';
import SplashScreen from './components/SplashScreen';
import { useApp } from './store';
import { calculateWeeklyScore, getWeekStart } from './utils';
import type { GamificationSettings } from './types';
import './App.css';

export default function App() {
  const { state, dispatch } = useApp();
  const [showData, setShowData] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<GamificationSettings>({ ...state.settings.gamification });
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Persist current week's score whenever it changes (moved from Gamification.tsx)
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const previousStreak = useMemo(() => {
    const prevScores = state.weeklyScores
      .filter(s => new Date(s.weekStart) < currentWeekStart)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    let streak = 0;
    for (const s of prevScores) {
      if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1)) streak++;
      else break;
    }
    return streak;
  }, [state.weeklyScores]);

  const currentScore = useMemo(() =>
    calculateWeeklyScore(state.focusAreas, state.timeEntries, state.settings.gamification, currentWeekStart, previousStreak),
    [state.focusAreas, state.timeEntries, state.settings.gamification, currentWeekStart, previousStreak],
  );

  useEffect(() => {
    if (state.focusAreas.length > 0) {
      dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
    }
  }, [currentScore]);

  useEffect(() => {
    const handler = () => setSwUpdateReady(true);
    window.addEventListener('sw-update-ready', handler);
    return () => window.removeEventListener('sw-update-ready', handler);
  }, []);

  const saveGamSettings = () => {
    dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: editSettings });
    setShowGameSettings(false);
  };

  const exportData = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifetracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.focusAreas && data.timeEntries) {
          dispatch({ type: 'LOAD_STATE', payload: data });
          setShowData(false);
        }
      } catch { /* invalid file */ }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
    <SplashScreen />
    <div className="app-layout">
      <header className="app-header">
        <h1>LifeTracker</h1>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditSettings({ ...state.settings.gamification }); setShowGameSettings(true); }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
            </svg>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowData(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </button>
        </div>
      </header>
      {swUpdateReady && (
        <div className="update-banner">
          <span>New version available</span>
          <button className="btn btn-sm" onClick={() => window.location.reload()}>
            Update
          </button>
        </div>
      )}
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/track" replace />} />
          <Route path="/status" element={<Dashboard />} />
          <Route path="/areas" element={<FocusAreas />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/track" element={<Tracking />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="/templates" element={<WeekTemplates />} />
        </Routes>
      </main>
      <BottomNav />

      {showData && (
        <Modal title="Data Management" onClose={() => setShowData(false)}>
          <p className="text-secondary text-sm mb-16">
            Your data is stored in the browser. Export a backup to keep it safe across cache clears.
          </p>
          <button className="btn btn-primary btn-block mb-16" onClick={exportData}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Export Backup (JSON)
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => fileRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
            Import Backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={importData}
          />
          <p className="text-secondary text-sm mt-16" style={{ fontSize: 11 }}>
            Tip: Export regularly so you can restore after clearing browser data.
          </p>
        </Modal>
      )}

      {showGameSettings && (
        <Modal title="Reward Settings" onClose={() => setShowGameSettings(false)}>
          <div className="form-group">
            <label className="form-label">Monthly reward budget (€)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.monthlyRewardBudget}
              onChange={e => setEditSettings({ ...editSettings, monthlyRewardBudget: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1"
            />
            <div className="text-secondary text-sm mt-8">
              Prize money available per 4-week period. Reaching 100% of your weekly targets every week
              earns the full amount. Set to 0 to disable financial tracking.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Points per target hour</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.pointsPerTargetHour}
              onChange={e => setEditSettings({ ...editSettings, pointsPerTargetHour: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1"
            />
            <div className="text-secondary text-sm mt-8">
              Affects proportional reward calculation. (e.g., 10h target at 100% = {editSettings.pointsPerTargetHour * 10} pts)
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Balance bonus (per area)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.balanceBasePoints}
              onChange={e => setEditSettings({ ...editSettings, balanceBasePoints: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Streak bonus (per consecutive week)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.streakBonusPoints}
              onChange={e => setEditSettings({ ...editSettings, streakBonusPoints: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Gamification enabled
              <button
                className={`toggle-btn ${editSettings.enabled ? 'on' : ''}`}
                onClick={() => setEditSettings({ ...editSettings, enabled: !editSettings.enabled })}
              >
                <span className="toggle-knob" />
              </button>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowGameSettings(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveGamSettings}>Save</button>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
}
