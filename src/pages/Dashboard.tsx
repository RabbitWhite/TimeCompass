import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { formatDuration, getWeekStart, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros, generateId } from '../utils';
import type { WalletTransaction } from '../types';

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [showSpend, setShowSpend] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendNote, setSpendNote] = useState('');
  const [showLog, setShowLog] = useState(false);
  const spendInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.activeTracking) return;
    const tick = () => {
      const start = new Date(state.activeTracking!.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 60000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.activeTracking]);

  const activeArea = state.activeTracking
    ? state.focusAreas.find(a => a.id === state.activeTracking!.focusAreaId)
    : null;

  // Gamification
  const gamSettings = state.settings.gamification;
  const currentWeekStart = getWeekStart();
  const previousStreak = useMemo(() => {
    const prevScores = state.weeklyScores
      .filter(s => new Date(s.weekStart) < currentWeekStart)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    let streak = 0;
    for (const s of prevScores) {
      if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1)) {
        streak++;
      } else break;
    }
    return streak;
  }, [state.weeklyScores]);

  const currentScore = useMemo(() => {
    return calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak);
  }, [state.focusAreas, state.timeEntries, gamSettings, previousStreak]);

  // Period reward calculation
  const currentPeriodIdx = getPeriodIndex(currentWeekStart);
  const maxWeekPts = computeMaxWeekPoints(state.focusAreas, gamSettings);
  const currentPeriodPoints = state.weeklyScores
    .filter(s => {
      const wStart = new Date(s.weekStart);
      return getPeriodIndex(wStart) === currentPeriodIdx
        && wStart.getTime() !== currentWeekStart.getTime();
    })
    .reduce((s, sc) => s + sc.totalPoints, 0) + currentScore.totalPoints;
  const currentPeriodEuros = pointsToEuros(currentPeriodPoints, maxWeekPts, gamSettings.monthlyRewardBudget);
  const { start: periodStart, end: pEnd } = getPeriodDateRange(currentPeriodIdx);
  const budget = gamSettings.monthlyRewardBudget;

  const { periodResetDate } = state.settings;
  const effectivePeriodStart = periodResetDate && !isNaN(new Date(periodResetDate).getTime())
    ? new Date(periodResetDate)
    : periodStart;

  // Period progress
  const periodActualMinutes = state.timeEntries
    .filter(e => {
      const d = new Date(e.startTime);
      return d >= effectivePeriodStart && d <= pEnd;
    })
    .reduce((s, e) => s + e.duration, 0);
  const periodTargetMinutes = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours * 4 * 60, 0);
  const periodPct = periodTargetMinutes > 0 ? Math.min(1, periodActualMinutes / periodTargetMinutes) : 0;

  return (
    <div>
      <div className="dash-welcome">
        <h2>Time Compass</h2>
        <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {state.activeTracking && activeArea && (
        <div className="tracker-banner" style={{ background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }}>
          <div className="tracking-label">Currently tracking</div>
          <div className="tracking-area">{activeArea.name}</div>
          <div className="tracking-time">{formatDuration(elapsed)}</div>
          <button className="btn btn-sm" onClick={() => navigate('/track')}>
            View Tracker
          </button>
        </div>
      )}

      {gamSettings.enabled && (
        <div className="dash-points-card">
          <div className="dash-points-left">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--warning)">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 17.9V20H7v2h10v-2h-4v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
            <div>
              <div className="dash-points-level">Monthly Reward</div>
              <div className="dash-points-total">
                {budget > 0
                  ? `Period from ${periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : `${Math.round(currentScore.totalPoints)} pts this week`}
              </div>
            </div>
          </div>
          <div className="dash-points-right">
            {budget > 0 ? (
              <>
                <div className="dash-points-week">€{formatEuros(currentPeriodEuros)}</div>
                <div className="dash-points-label">of €{formatEuros(budget)}</div>
              </>
            ) : (
              <>
                <div className="dash-points-week">{Math.round(currentScore.totalPoints)}</div>
                <div className="dash-points-label">pts this week</div>
              </>
            )}
          </div>
        </div>
      )}

      {budget > 0 && (
        <div className="dash-points-card" style={{ marginTop: 8 }}>
          <div className="dash-points-left">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--success)">
              <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
            <div>
              <div className="dash-points-level">Prize Wallet</div>
              <div className="dash-points-total">Accumulated earnings</div>
            </div>
          </div>
          <div className="dash-points-right">
            <div className="dash-points-week">€{formatEuros(state.settings.walletBalance)}</div>
            <button className="btn btn-sm btn-primary" style={{ marginTop: 4 }} onClick={() => { setSpendAmount(''); setSpendNote(''); setShowSpend(true); }}>
              Use Prize Money
            </button>
          </div>
        </div>
      )}

      {budget > 0 && (
        <div style={{ marginBottom: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, padding: '2px 8px' }}
            onClick={() => setShowLog(l => !l)}
          >
            {showLog ? 'Hide' : 'Show'} transaction log
          </button>
          {showLog && (
            <div style={{ marginTop: 8 }}>
              {state.walletTransactions.length === 0 && (
                <p className="text-secondary text-sm">No transactions yet.</p>
              )}
              {state.walletTransactions.slice(0, 10).map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{tx.note}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(tx.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: tx.type === 'credit' ? 'var(--success)' : 'var(--error)' }}>
                    {tx.type === 'credit' ? '+' : '-'}€{formatEuros(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {periodTargetMinutes > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Period Progress</span>
          </div>
          <div className="allocation-bar">
            <div className="allocation-header">
              <span className="allocation-hours">{formatDuration(periodActualMinutes)}</span>
              <span className="allocation-hours">{formatDuration(periodTargetMinutes)}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${periodPct * 100}%`, background: 'var(--primary)' }} />
            </div>
          </div>
        </>
      )}

      {state.focusAreas.length === 0 && !state.activeTracking && (
        <div className="empty-state mt-16">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          <p>Welcome to Time Compass!<br />Start by adding your first focus area.</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/areas')}>
            Add Focus Area
          </button>
        </div>
      )}

      {showSpend && (
        <Modal title="Use Prize Money" onClose={() => setShowSpend(false)}>
          <div className="form-group">
            <label className="form-label">Amount (€)</label>
            <input
              ref={spendInputRef}
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              value={spendAmount}
              onChange={e => setSpendAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="What did you buy?"
              value={spendNote}
              onChange={e => setSpendNote(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowSpend(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!spendAmount || parseFloat(spendAmount) <= 0}
              onClick={() => {
                const amount = parseFloat(spendAmount);
                if (!amount || amount <= 0) return;
                const tx: WalletTransaction = {
                  id: generateId(),
                  date: new Date().toISOString(),
                  amount,
                  note: spendNote.trim() || 'Purchase',
                  type: 'debit',
                };
                dispatch({ type: 'ADD_WALLET_TRANSACTION', payload: tx });
                dispatch({ type: 'UPDATE_WALLET_SETTINGS', payload: { walletBalance: Math.max(0, state.settings.walletBalance - amount) } });
                setShowSpend(false);
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
