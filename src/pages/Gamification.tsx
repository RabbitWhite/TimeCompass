import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import {
  calculateWeeklyScore,
  getWeekStart,
  getWeekLabel,
  getLevelFromPoints,
  formatDuration,
} from '../utils';
import type { GamificationSettings } from '../types';

export default function Gamification() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const gamSettings = state.settings.gamification;

  const [editSettings, setEditSettings] = useState<GamificationSettings>({ ...gamSettings });

  // Recalculate current week score live
  const currentWeekStart = getWeekStart();
  const previousStreak = useMemo(() => {
    // Find streak from weeks before this one
    const prevScores = state.weeklyScores
      .filter(s => new Date(s.weekStart) < currentWeekStart)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    let streak = 0;
    for (const s of prevScores) {
      if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [state.weeklyScores]);

  const currentScore = useMemo(() => {
    return calculateWeeklyScore(
      state.focusAreas,
      state.timeEntries,
      gamSettings,
      currentWeekStart,
      previousStreak,
    );
  }, [state.focusAreas, state.timeEntries, gamSettings, previousStreak]);

  // Auto-save current week score
  useEffect(() => {
    if (state.focusAreas.length > 0) {
      dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
    }
  }, [currentScore]);

  const allTimePoints = useMemo(() => {
    return state.weeklyScores.reduce((s, w) => s + w.totalPoints, 0);
  }, [state.weeklyScores]);

  const level = getLevelFromPoints(allTimePoints);

  const pastScores = state.weeklyScores
    .filter(s => new Date(s.weekStart).getTime() !== currentWeekStart.getTime())
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
    .slice(0, 12);

  const maxHistoryPoints = Math.max(1, ...state.weeklyScores.map(s => s.totalPoints));

  const saveSettings = () => {
    dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: editSettings });
    setShowSettings(false);
  };

  if (!gamSettings.enabled) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/')}>
          &larr; Dashboard
        </button>
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
          <p>Gamification is disabled.</p>
          <button
            className="btn btn-primary mt-16"
            onClick={() => dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: { enabled: true } })}
          >
            Enable Points
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        &larr; Dashboard
      </button>

      {/* Level & Total Points */}
      <div className="gamification-hero">
        <div className="level-badge">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--warning)">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span className="level-number">Lv.{level.level}</span>
        </div>
        <div className="level-title">{level.title}</div>
        <div className="total-points">{Math.round(allTimePoints)} pts</div>
        <div className="level-progress-track">
          <div className="level-progress-fill" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <div className="level-progress-label">
          {Math.round(allTimePoints)} / {level.nextThreshold} pts to next level
        </div>
      </div>

      {/* This Week's Score */}
      <div className="section-header mt-16">
        <span className="section-title">This Week</span>
        <button className="btn btn-ghost btn-sm" onClick={() => { setEditSettings({ ...gamSettings }); setShowSettings(true); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
          </svg>
          Settings
        </button>
      </div>

      <div className="score-card">
        <div className="score-total">
          <span className="score-number">{currentScore.totalPoints}</span>
          <span className="score-unit">pts this week</span>
        </div>

        <div className="score-breakdown">
          <div className="score-row">
            <div className="score-row-label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--success)">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Achievement
            </div>
            <span className="score-row-value">{currentScore.achievementPoints} pts</span>
          </div>
          <div className="score-row">
            <div className="score-row-label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
              </svg>
              Balance ({Math.round(currentScore.balanceRatio * 100)}%)
            </div>
            <span className="score-row-value">{currentScore.balancePoints} pts</span>
          </div>
          <div className="score-row">
            <div className="score-row-label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--warning)">
                <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51L12.96 17.55 11 21z" />
              </svg>
              Streak ({currentScore.streakWeeks}w)
            </div>
            <span className="score-row-value">{currentScore.streakBonus} pts</span>
          </div>
        </div>
      </div>

      {/* Per-Area Breakdown */}
      {currentScore.areaScores.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Area Scores</span>
          </div>
          {currentScore.areaScores.map(as => {
            const area = state.focusAreas.find(a => a.id === as.focusAreaId);
            if (!area) return null;
            const pct = Math.round(as.completionRate * 100);
            return (
              <div className="area-score-card" key={as.focusAreaId}>
                <div className="area-score-header">
                  <div className="allocation-name">
                    <span className="dot" style={{ background: area.color }} />
                    {area.name}
                  </div>
                  <span className="score-pts">+{as.pointsEarned} pts</span>
                </div>
                <div className="bar-track" style={{ marginTop: 6 }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: pct >= 100 ? 'var(--success)' : area.color,
                    }}
                  />
                </div>
                <div className="area-score-detail">
                  <span>{formatDuration(Math.round(as.actualHours * 60))} / {as.targetHours}h target</span>
                  <span style={{ color: pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Balance Visualization */}
      {currentScore.areaScores.length > 1 && (
        <div className="chart-container mt-16">
          <div className="chart-title">Balance Meter</div>
          <div className="balance-meter">
            <div className="balance-meter-track">
              <div
                className="balance-meter-fill"
                style={{
                  width: `${currentScore.balanceRatio * 100}%`,
                  background: currentScore.balanceRatio >= 0.8
                    ? 'var(--success)'
                    : currentScore.balanceRatio >= 0.5
                    ? 'var(--warning)'
                    : 'var(--error)',
                }}
              />
            </div>
            <div className="balance-meter-labels">
              <span>Imbalanced</span>
              <span>{Math.round(currentScore.balanceRatio * 100)}%</span>
              <span>Balanced</span>
            </div>
          </div>
          <p className="text-secondary text-sm mt-8">
            {currentScore.balanceRatio >= 0.8
              ? 'Great balance! You are addressing all your focus areas evenly.'
              : currentScore.balanceRatio >= 0.5
              ? 'Moderate balance. Some areas need more attention.'
              : 'Low balance. Over-investing in some areas while neglecting others reduces your score.'}
          </p>
        </div>
      )}

      {/* History */}
      {pastScores.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">History</span>
          </div>
          <div className="history-chart">
            {state.weeklyScores
              .slice()
              .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
              .slice(-8)
              .map(score => {
                const isCurrent = new Date(score.weekStart).getTime() === currentWeekStart.getTime();
                const h = maxHistoryPoints > 0 ? (score.totalPoints / maxHistoryPoints) * 100 : 0;
                return (
                  <div className="history-bar-wrap" key={score.weekStart}>
                    <div className="history-bar-container">
                      <div
                        className="history-bar"
                        style={{
                          height: `${Math.max(h, score.totalPoints > 0 ? 4 : 0)}%`,
                          background: isCurrent ? 'var(--primary)' : 'var(--surface-elevated)',
                        }}
                      />
                    </div>
                    <span className="history-label">
                      {new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' })}
                    </span>
                    <span className="history-pts">{Math.round(score.totalPoints)}</span>
                  </div>
                );
              })}
          </div>

          {pastScores.map(score => (
            <div className="time-entry" key={score.weekStart}>
              <div className="time-entry-info">
                <div className="time-entry-area">{getWeekLabel(score.weekStart)}</div>
                <div className="time-entry-time">
                  Achievement: {score.achievementPoints} | Balance: {score.balancePoints} | Streak: {score.streakBonus}
                </div>
              </div>
              <div className="time-entry-duration">{Math.round(score.totalPoints)} pts</div>
            </div>
          ))}
        </>
      )}

      {state.focusAreas.filter(a => a.weeklyTargetHours > 0).length === 0 && (
        <div className="empty-state mt-16">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
          <p>Set weekly target hours on your focus areas to start earning points.</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/areas')}>
            Set Targets
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Modal title="Points Settings" onClose={() => setShowSettings(false)}>
          <p className="text-secondary text-sm mb-16">
            Adjust how points are calculated. Changes apply to all future score calculations.
          </p>

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
              Points earned per hour of weekly target when fully achieved. (e.g., 10h target at 100% = {editSettings.pointsPerTargetHour * 10} pts)
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
            <div className="text-secondary text-sm mt-8">
              Bonus points per area for keeping all areas balanced. Scales with completion uniformity.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Streak bonus (per week)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.streakBonusPoints}
              onChange={e => setEditSettings({ ...editSettings, streakBonusPoints: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1"
            />
            <div className="text-secondary text-sm mt-8">
              Bonus for consecutive weeks hitting all targets. Multiplied by streak count (week 3 = {editSettings.streakBonusPoints * 3} pts).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Gamification
              <button
                className={`toggle-btn ${editSettings.enabled ? 'on' : ''}`}
                onClick={() => setEditSettings({ ...editSettings, enabled: !editSettings.enabled })}
              >
                <span className="toggle-knob" />
              </button>
            </label>
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveSettings}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
