import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import {
  calculateWeeklyScore,
  getWeekStart,
  formatDuration,
  getPeriodIndex,
  getPeriodDateRange,
  getWeekWithinPeriod,
  computeMaxWeekPoints,
  pointsToEuros,
  formatEuros,
} from '../utils';
import type { GamificationSettings } from '../types';

export default function Gamification() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const gamSettings = state.settings.gamification;

  const [editSettings, setEditSettings] = useState<GamificationSettings>({ ...gamSettings });

  // ── Current week live score ───────────────────────────────────────────────
  const currentWeekStart = getWeekStart();

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

  const currentScore = useMemo(() => calculateWeeklyScore(
    state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak,
  ), [state.focusAreas, state.timeEntries, gamSettings, previousStreak]);

  useEffect(() => {
    if (state.focusAreas.length > 0) {
      dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
    }
  }, [currentScore]);

  // ── Reward period calculations ────────────────────────────────────────────
  const maxWeekPts = useMemo(
    () => computeMaxWeekPoints(state.focusAreas, gamSettings),
    [state.focusAreas, gamSettings],
  );

  const currentPeriodIdx = getPeriodIndex(currentWeekStart);
  const { start: periodStart, end: periodEnd } = getPeriodDateRange(currentPeriodIdx);

  // Week number within current period (1–4), timezone-safe
  const weekWithinPeriod = getWeekWithinPeriod(currentWeekStart, currentPeriodIdx);

  // Sum all points earned within the current period (use live currentScore for this week)
  const currentPeriodPoints = useMemo(() => {
    const pastWeeksInPeriod = state.weeklyScores
      .filter(s => {
        const wStart = new Date(s.weekStart);
        return getPeriodIndex(wStart) === currentPeriodIdx
          && wStart.getTime() !== currentWeekStart.getTime();
      })
      .reduce((s, sc) => s + sc.totalPoints, 0);
    return pastWeeksInPeriod + currentScore.totalPoints;
  }, [state.weeklyScores, currentScore, currentPeriodIdx]);

  const currentPeriodEuros = pointsToEuros(currentPeriodPoints, maxWeekPts, gamSettings.monthlyRewardBudget);
  const periodProgressPct = gamSettings.monthlyRewardBudget > 0 && maxWeekPts > 0
    ? Math.min(1, currentPeriodPoints / (maxWeekPts * 4))
    : 0;

  // ── Past periods ─────────────────────────────────────────────────────────
  const pastPeriods = useMemo(() => {
    const byPeriod = new Map<number, number>(); // periodIdx → totalPoints
    for (const s of state.weeklyScores) {
      const idx = getPeriodIndex(new Date(s.weekStart));
      if (idx >= currentPeriodIdx) continue;
      byPeriod.set(idx, (byPeriod.get(idx) ?? 0) + s.totalPoints);
    }
    return [...byPeriod.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .map(([idx, pts]) => {
        const { start, end } = getPeriodDateRange(idx);
        const euros = pointsToEuros(pts, maxWeekPts, gamSettings.monthlyRewardBudget);
        const pct = maxWeekPts > 0 ? Math.min(1, pts / (maxWeekPts * 4)) : 0;
        return { idx, pts, euros, pct, start, end };
      });
  }, [state.weeklyScores, currentPeriodIdx, maxWeekPts, gamSettings.monthlyRewardBudget]);

  const totalAcquiredEuros = pastPeriods.reduce((s, p) => s + p.euros, 0);

  const budget = gamSettings.monthlyRewardBudget;

  const saveSettings = () => {
    dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: editSettings });
    setShowSettings(false);
  };

  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (!gamSettings.enabled) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/')}>← Dashboard</button>
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
          <p>Gamification is disabled.</p>
          <button className="btn btn-primary mt-16"
            onClick={() => dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: { enabled: true } })}>
            Enable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Dashboard</button>

      {/* ── Reward Period Card ─────────────────────────────────────────────── */}
      <div className="section-header mt-16">
        <span className="section-title">Monthly Reward</span>
        <button className="btn btn-ghost btn-sm"
          onClick={() => { setEditSettings({ ...gamSettings }); setShowSettings(true); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
          </svg>
          Settings
        </button>
      </div>

      <div className="score-card">
        {budget > 0 ? (
          <>
            <div className="score-total">
              <span className="score-number" style={{ fontSize: 36 }}>€{formatEuros(currentPeriodEuros)}</span>
              <span className="score-unit">earned this period</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="bar-track">
                <div className="bar-fill" style={{
                  width: `${periodProgressPct * 100}%`,
                  background: periodProgressPct >= 1 ? 'var(--success)' : 'var(--primary)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>€0</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {Math.round(periodProgressPct * 100)}% of €{formatEuros(budget)}
                </span>
                <span>€{formatEuros(budget)}</span>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              {fmtDate(periodStart)} – {fmtDate(periodEnd)}
              {'  •  '}Week {weekWithinPeriod} of 4
            </div>

            {totalAcquiredEuros > 0 && (
              <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 15,
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total acquired (past periods)</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>€{formatEuros(totalAcquiredEuros)}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Set a monthly reward budget to track your financial incentive.
              Points still accumulate in the background.
            </div>
            <button className="btn btn-primary btn-sm"
              onClick={() => { setEditSettings({ ...gamSettings }); setShowSettings(true); }}>
              Set Budget
            </button>
          </div>
        )}
      </div>

      {/* ── This Week ─────────────────────────────────────────────────────── */}
      <div className="section-header mt-16">
        <span className="section-title">This Week</span>
        {budget > 0 && maxWeekPts > 0 && (
          <span className="text-secondary text-sm">
            ~€{formatEuros(pointsToEuros(currentScore.totalPoints, maxWeekPts, budget / 4))} so far
          </span>
        )}
      </div>

      <div className="score-card">
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
          <div className="score-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
            <div className="score-row-label" style={{ fontWeight: 600 }}>Total</div>
            <span className="score-row-value" style={{ fontWeight: 700 }}>{currentScore.totalPoints} pts</span>
          </div>
        </div>
      </div>

      {/* ── Per-Area Breakdown ─────────────────────────────────────────────── */}
      {currentScore.areaScores.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Area Progress</span>
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
                  <span style={{ fontSize: 14, color: pct >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {pct}%
                  </span>
                </div>
                <div className="bar-track" style={{ marginTop: 6 }}>
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? 'var(--success)' : area.color }}
                  />
                </div>
                <div className="area-score-detail">
                  <span>{formatDuration(Math.round(as.actualHours * 60))} / {as.targetHours}h target</span>
                  {budget > 0 && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {as.pointsEarned} pts
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Balance Meter ─────────────────────────────────────────────────── */}
      {currentScore.areaScores.length > 1 && (
        <div className="chart-container mt-16">
          <div className="chart-title">Balance</div>
          <div className="balance-meter">
            <div className="balance-meter-track">
              <div className="balance-meter-fill" style={{
                width: `${currentScore.balanceRatio * 100}%`,
                background: currentScore.balanceRatio >= 0.8 ? 'var(--success)'
                  : currentScore.balanceRatio >= 0.5 ? 'var(--warning)' : 'var(--error)',
              }} />
            </div>
            <div className="balance-meter-labels">
              <span>Imbalanced</span>
              <span>{Math.round(currentScore.balanceRatio * 100)}%</span>
              <span>Balanced</span>
            </div>
          </div>
          <p className="text-secondary text-sm mt-8">
            {currentScore.balanceRatio >= 0.8
              ? 'Great balance across all focus areas.'
              : currentScore.balanceRatio >= 0.5
              ? 'Moderate balance — some areas need more attention.'
              : 'Low balance — over-investing in some areas while neglecting others.'}
          </p>
        </div>
      )}

      {/* ── Past Periods ─────────────────────────────────────────────────── */}
      {pastPeriods.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Past Periods</span>
            {budget > 0 && (
              <span className="text-secondary text-sm">
                Total: €{formatEuros(totalAcquiredEuros)}
              </span>
            )}
          </div>
          {pastPeriods.map(period => (
            <div className="time-entry" key={period.idx}>
              <div className="time-entry-info">
                <div className="time-entry-area">
                  {fmtDate(period.start)} – {fmtDate(period.end)}
                </div>
                <div className="time-entry-time">
                  {Math.round(period.pts)} pts
                  {maxWeekPts > 0 && (
                    <> • {Math.round(period.pct * 100)}% of max</>
                  )}
                </div>
              </div>
              {budget > 0 ? (
                <div style={{ fontWeight: 700, color: period.pct >= 1 ? 'var(--success)' : 'var(--text)' }}>
                  €{formatEuros(period.euros)}
                </div>
              ) : (
                <div className="time-entry-duration">{Math.round(period.pts)} pts</div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── Weekly history chart ──────────────────────────────────────────── */}
      {state.weeklyScores.length > 1 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Weekly History</span>
          </div>
          <div className="history-chart">
            {state.weeklyScores
              .slice()
              .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
              .slice(-8)
              .map(score => {
                const isCurrent = new Date(score.weekStart).getTime() === currentWeekStart.getTime();
                const maxPts = Math.max(1, ...state.weeklyScores.map(s => s.totalPoints));
                const barPx = maxPts > 0 ? Math.round((score.totalPoints / maxPts) * 72) : 0;
                const finalPx = score.totalPoints > 0 ? Math.max(barPx, 4) : 0;
                return (
                  <div className="history-bar-wrap" key={score.weekStart}>
                    <div className="history-bar-container" style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div
                        className="history-bar"
                        style={{
                          height: finalPx,
                          background: isCurrent ? 'var(--primary)' : 'rgba(108, 99, 255, 0.35)',
                        }}
                      />
                    </div>
                    <span className="history-label">
                      {new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' })}
                    </span>
                    {budget > 0 && maxWeekPts > 0 ? (
                      <span className="history-pts" style={{ fontSize: 11 }}>
                        €{formatEuros(pointsToEuros(score.totalPoints, maxWeekPts, budget / 4))}
                      </span>
                    ) : (
                      <span className="history-pts">{Math.round(score.totalPoints)}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {state.focusAreas.filter(a => a.weeklyTargetHours > 0).length === 0 && (
        <div className="empty-state mt-16">
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
          <p>Set weekly target hours on your focus areas to start tracking rewards.</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/areas')}>Set Targets</button>
        </div>
      )}

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      {showSettings && (
        <Modal title="Reward Settings" onClose={() => setShowSettings(false)}>
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
            <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveSettings}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
