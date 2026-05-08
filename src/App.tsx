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
import { useApp, readRecoveryRecord } from './store';
import { calculateWeeklyScore, getWeekStart, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, getCompletedPeriodEuros, pointsToEuros, formatEuros, generateId } from './utils';
import { getDriveToken, syncToDrive, restoreFromDrive, attemptSilentReauth } from './utils/driveSync';
import type { AppState, GamificationSettings, AppSettings, WalletTransaction } from './types';
import './App.css';

export default function App() {
  const { state, dispatch } = useApp();
  const [showData, setShowData] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<{
    enabled: boolean;
    monthlyRewardBudget: string;
    pointsPerTargetHour: string;
    balanceBasePoints: string;
    streakBonusPoints: string;
  }>({
    enabled: state.settings.gamification.enabled,
    monthlyRewardBudget: String(state.settings.gamification.monthlyRewardBudget),
    pointsPerTargetHour: String(state.settings.gamification.pointsPerTargetHour),
    balanceBasePoints: String(state.settings.gamification.balanceBasePoints),
    streakBonusPoints: String(state.settings.gamification.streakBonusPoints),
  });
  const [editSplash, setEditSplash] = useState<Pick<AppSettings, 'splashPhilosophyText' | 'splashPrizeImage' | 'splashDismissMode' | 'splashDuration'>>({
    splashPhilosophyText: state.settings.splashPhilosophyText,
    splashPrizeImage: state.settings.splashPrizeImage,
    splashDismissMode: state.settings.splashDismissMode,
    splashDuration: state.settings.splashDuration,
  });
  const [editSplashDuration, setEditSplashDuration] = useState(String(state.settings.splashDuration));
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);
  const [editDriveEnabled, setEditDriveEnabled] = useState(state.settings.driveBackupEnabled);
  const [driveNeedsReauth, setDriveNeedsReauth] = useState(
    () => state.settings.driveBackupEnabled && !getDriveToken()
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPending, setImportPending] = useState<AppState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDriveRecoveryPrompt, setShowDriveRecoveryPrompt] = useState(false);
  const [driveRecoveryError, setDriveRecoveryError] = useState<string | null>(null);

  // Persist current week's score whenever it changes (moved from Gamification.tsx)
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const prevCompletedPeriodIdx = useMemo(() => getPeriodIndex(currentWeekStart) - 1, [currentWeekStart]);
  const maxWeekPoints = useMemo(() => computeMaxWeekPoints(state.focusAreas, state.settings.gamification), [state.focusAreas, state.settings.gamification]);
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

  const currentPeriodIdx = prevCompletedPeriodIdx + 1;
  const { start: currentPeriodStart } = getPeriodDateRange(currentPeriodIdx);
  const currentPeriodPoints = useMemo(() => {
    const past = state.weeklyScores
      .filter(s => {
        const wStart = new Date(s.weekStart);
        return getPeriodIndex(wStart) === currentPeriodIdx
          && wStart.getTime() !== currentWeekStart.getTime();
      })
      .reduce((s, sc) => s + sc.totalPoints, 0);
    return past + currentScore.totalPoints;
  }, [state.weeklyScores, currentScore, currentPeriodIdx, currentWeekStart]);
  const currentPeriodEuros = pointsToEuros(
    currentPeriodPoints, maxWeekPoints, state.settings.gamification.monthlyRewardBudget,
  );

  useEffect(() => {
    if (state.focusAreas.length > 0) {
      dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
    }
  }, [currentScore]);

  useEffect(() => {
    const { lastCreditedPeriodIndex, walletBalance, gamification } = state.settings;
    if (!gamification.enabled || gamification.monthlyRewardBudget === 0) return;
    if (prevCompletedPeriodIdx < 0) return;
    if (lastCreditedPeriodIndex >= prevCompletedPeriodIdx) return;

    let balance = walletBalance;
    let lastIdx = lastCreditedPeriodIndex;
    for (let idx = lastCreditedPeriodIndex + 1; idx <= prevCompletedPeriodIdx; idx++) {
      const euros = getCompletedPeriodEuros(state.weeklyScores, idx, maxWeekPoints, gamification.monthlyRewardBudget);
      const tx: WalletTransaction = {
        id: generateId(),
        date: new Date().toISOString(),
        amount: euros,
        note: 'Period earnings',
        type: 'credit',
      };
      dispatch({ type: 'ADD_WALLET_TRANSACTION', payload: tx });
      balance += euros;
      lastIdx = idx;
    }
    dispatch({ type: 'UPDATE_WALLET_SETTINGS', payload: { walletBalance: balance, lastCreditedPeriodIndex: lastIdx } });
  }, [state.weeklyScores, state.settings.lastCreditedPeriodIndex, prevCompletedPeriodIdx]);

  useEffect(() => {
    const handler = () => setSwUpdateReady(true);
    window.addEventListener('sw-update-ready', handler);
    return () => window.removeEventListener('sw-update-ready', handler);
  }, []);

  useEffect(() => {
    setDriveNeedsReauth(state.settings.driveBackupEnabled && !getDriveToken());
  }, [state.settings.driveBackupEnabled]);

  const reauthDrive = () => {
    const clientId = state.settings.googleClientId;
    if (!clientId) return;
    try {
      const tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        callback: (response: any) => {
          if (response.error) return;
          dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: response.access_token } });
          setDriveNeedsReauth(false);
        },
      });
      tokenClient?.requestAccessToken();
    } catch { /* Google Identity Services not loaded */ }
  };

  // Keep a ref so the visibilitychange handler always sees current state
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!state.settings.driveBackupEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'hidden') return;
      const token = getDriveToken();
      if (!token) return;

      const s = stateRef.current;
      const { lastSavedTimestamp, settings: { driveLastSynced, driveFileId } } = s;

      // Only upload if local state is newer than last Drive sync
      const hasUnsavedDiff =
        !driveLastSynced ||
        (lastSavedTimestamp != null && new Date(lastSavedTimestamp) > new Date(driveLastSynced));
      if (!hasUnsavedDiff) return;

      const newFileId = await syncToDrive(token, s, driveFileId);
      if (newFileId) {
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: { driveLastSynced: new Date().toISOString(), driveFileId: newFileId },
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.settings.driveBackupEnabled, dispatch]);

  // On mount: if Drive backup is enabled and a token exists, restore from Drive if
  // the remote copy is strictly newer than local state. If no token is present,
  // attempt silent re-auth (prompt='') before falling back to the reconnect banner.
  useEffect(() => {
    if (!state.settings.driveBackupEnabled) return;

    const doRestore = async (t: string) => {
      const remote = await restoreFromDrive(t) as AppState | null;
      if (!remote) return;
      const remoteTs = (remote as AppState).lastSavedTimestamp;
      const localTs = state.lastSavedTimestamp;
      if (remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs))) {
        dispatch({ type: 'LOAD_STATE', payload: remote as AppState });
      }
    };

    const token = getDriveToken();
    if (token) {
      doRestore(token);
      return;
    }

    attemptSilentReauth(
      state.settings.googleClientId,
      'https://www.googleapis.com/auth/drive.appdata',
      (newToken) => {
        if (!newToken) return;
        dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: newToken } });
        setDriveNeedsReauth(false);
        doRestore(newToken);
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount-only, intentional

  // On mount: if local state looks blank and a recovery record says Drive was enabled,
  // attempt silent re-auth and restore. Falls back to a manual-restore banner.
  useEffect(() => {
    const isBlank = state.focusAreas.length === 0 || !state.settings.googleClientId;
    if (!isBlank) return;
    const record = readRecoveryRecord();
    if (!record || !record.driveBackupEnabled) return;

    const doRecovery = (token: string) => {
      sessionStorage.setItem('googleAccessToken', token);
      dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: token } });
      restoreFromDrive(token).then((remote) => {
        if (!remote) return;
        const remoteTs = (remote as AppState).lastSavedTimestamp;
        const localTs = state.lastSavedTimestamp;
        if (remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs))) {
          dispatch({ type: 'LOAD_STATE', payload: remote as AppState });
          setShowDriveRecoveryPrompt(false);
        }
      });
    };

    attemptSilentReauth(
      record.clientId,
      'https://www.googleapis.com/auth/drive.appdata',
      (token) => {
        if (token) {
          doRecovery(token);
        } else {
          setShowDriveRecoveryPrompt(true);
        }
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount-only, intentional

  const saveGameSettings = () => {
    dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: {
      enabled: editSettings.enabled,
      monthlyRewardBudget: parseInt(editSettings.monthlyRewardBudget, 10) || 0,
      pointsPerTargetHour: parseInt(editSettings.pointsPerTargetHour, 10) || 0,
      balanceBasePoints: parseInt(editSettings.balanceBasePoints, 10) || 0,
      streakBonusPoints: parseInt(editSettings.streakBonusPoints, 10) || 0,
    }});
    dispatch({ type: 'UPDATE_SETTINGS', payload: {
      ...editSplash,
      splashDuration: Math.min(30, Math.max(3, parseInt(editSplashDuration, 10) || 5)),
      driveBackupEnabled: editDriveEnabled,
    }});
    setShowGameSettings(false);
  };

  const exportData = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timecompass-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        if (!Array.isArray(data.focusAreas) || data.focusAreas.length === 0) {
          setImportError('This file contains no focus areas. It may be empty or not a valid Time Compass backup. Import cancelled to protect your existing data.');
          return;
        }
        if (!Array.isArray(data.timeEntries)) {
          setImportError('This file is missing required fields. Import cancelled to protect your existing data.');
          return;
        }
        setImportPending(data as AppState);
      } catch {
        setImportError('This file could not be parsed. It may be corrupted or not a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmImport = () => {
    if (!importPending) return;
    exportData();
    dispatch({ type: 'LOAD_STATE', payload: importPending });
    setImportPending(null);
    setShowData(false);
  };

  return (
    <>
    <SplashScreen />
    <div className="app-layout">
      <header className="app-header">
        <h1>Time Compass</h1>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setEditSettings({
              enabled: state.settings.gamification.enabled,
              monthlyRewardBudget: String(state.settings.gamification.monthlyRewardBudget),
              pointsPerTargetHour: String(state.settings.gamification.pointsPerTargetHour),
              balanceBasePoints: String(state.settings.gamification.balanceBasePoints),
              streakBonusPoints: String(state.settings.gamification.streakBonusPoints),
            });
            setEditSplash({
              splashPhilosophyText: state.settings.splashPhilosophyText,
              splashPrizeImage: state.settings.splashPrizeImage,
              splashDismissMode: state.settings.splashDismissMode,
              splashDuration: state.settings.splashDuration,
            });
            setEditSplashDuration(String(state.settings.splashDuration));
            setEditDriveEnabled(state.settings.driveBackupEnabled);
            setShowGameSettings(true);
          }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
            </svg>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowData(true)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
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
      {driveNeedsReauth && (
        <div className="reauth-banner">
          <span>Drive backup needs reconnection</span>
          {state.settings.googleClientId ? (
            <button className="btn btn-sm reauth-banner-btn" onClick={reauthDrive}>
              Sign in
            </button>
          ) : (
            <span className="reauth-banner-hint">Set a Client ID in Timeline</span>
          )}
        </div>
      )}
      {showDriveRecoveryPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="text-sm">Your data is on Google Drive — tap to restore</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                const record = readRecoveryRecord();
                if (!record) return;
                setDriveRecoveryError(null);
                attemptSilentReauth(
                  record.clientId,
                  'https://www.googleapis.com/auth/drive.appdata',
                  (token) => {
                    if (!token) { setDriveRecoveryError('Sign-in failed. Please try again.'); return; }
                    sessionStorage.setItem('googleAccessToken', token);
                    dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: token } });
                    restoreFromDrive(token).then((remote) => {
                      if (!remote) { setDriveRecoveryError('No backup found on Drive.'); return; }
                      const remoteTs = (remote as AppState).lastSavedTimestamp;
                      const localTs = state.lastSavedTimestamp;
                      if (remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs))) {
                        dispatch({ type: 'LOAD_STATE', payload: remote as AppState });
                        setShowDriveRecoveryPrompt(false);
                      } else {
                        setDriveRecoveryError('Local state is already up to date.');
                      }
                    });
                  },
                );
              }}
            >
              Restore
            </button>
          </div>
          {driveRecoveryError && (
            <span className="text-sm" style={{ color: 'var(--error)' }}>{driveRecoveryError}</span>
          )}
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
        <Modal title="Data Management" onClose={() => { setShowData(false); setImportPending(null); setImportError(null); }}>
          {importError ? (
            <div style={{ background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)', marginBottom: 16 }}>
              <div className="text-sm" style={{ color: 'var(--error)', marginBottom: 8 }}><strong>Import failed</strong></div>
              <div className="text-sm" style={{ marginBottom: 12 }}>{importError}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setImportError(null)}>Dismiss</button>
            </div>
          ) : importPending ? (
            <div style={{ background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--warning, #f59e0b)' }}>
              <div className="text-sm" style={{ marginBottom: 12 }}><strong>Review before importing</strong></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 16px', marginBottom: 12, fontSize: 13 }}>
                <span />                           <strong>Current</strong>                     <strong>File</strong>
                <span>Focus areas</span>           <span>{state.focusAreas.length}</span>        <span>{(importPending.focusAreas as unknown[]).length}</span>
                <span>Time entries</span>          <span>{state.timeEntries.length}</span>       <span>{(importPending.timeEntries as unknown[]).length}</span>
                <span>Wallet transactions</span>   <span>{state.walletTransactions.length}</span> <span>{Array.isArray(importPending.walletTransactions) ? importPending.walletTransactions.length : 0}</span>
              </div>
              <div className="text-sm" style={{ marginBottom: 12 }}>
                <strong>Importing will permanently replace all current data.</strong> Your current state will be downloaded as a backup file automatically before importing.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setImportPending(null)}>Cancel</button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }}
                  onClick={confirmImport}
                >
                  Download backup &amp; import
                </button>
              </div>
            </div>
          ) : (
            <>
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
              <p className="text-secondary text-sm mt-16" style={{ fontSize: 11 }}>
                Tip: Export regularly so you can restore after clearing browser data.
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={importData}
          />
        </Modal>
      )}

      {showGameSettings && (
        <Modal title="Reward Settings" onClose={() => { setShowGameSettings(false); setShowResetConfirm(false); setShowHardResetConfirm(false); }}>
          <div className="form-group">
            <label className="form-label">Monthly reward budget (€)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.monthlyRewardBudget}
              onChange={e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, monthlyRewardBudget: isNaN(v) ? '' : String(v) }); }}
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
              onChange={e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, pointsPerTargetHour: isNaN(v) ? '' : String(v) }); }}
              min="0"
              step="1"
            />
            <div className="text-secondary text-sm mt-8">
              Affects proportional reward calculation. (e.g., 10h target at 100% = {(parseInt(editSettings.pointsPerTargetHour, 10) || 0) * 10} pts)
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Balance bonus (per area)</label>
            <input
              className="form-input"
              type="number"
              value={editSettings.balanceBasePoints}
              onChange={e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, balanceBasePoints: isNaN(v) ? '' : String(v) }); }}
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
              onChange={e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, streakBonusPoints: isNaN(v) ? '' : String(v) }); }}
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
          <div className="form-group">
            <label className="form-label">Period</label>
            <div className="text-secondary text-sm" style={{ marginBottom: 8 }}>
              Current period started{' '}
              {state.settings.periodResetDate
                ? new Date(state.settings.periodResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : currentPeriodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {state.settings.periodResetDate && ' (manual reset)'}
            </div>
            {!showResetConfirm ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }}
                  onClick={() => setShowResetConfirm(true)}
                  type="button"
                >
                  Reset Current Period
                </button>
                {state.settings.periodResetDate && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { periodResetDate: null } })}
                    type="button"
                  >
                    Clear Reset
                  </button>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)' }}>
                <div className="text-sm" style={{ marginBottom: 8 }}>
                  This starts a new period from today. Old entries are kept but excluded from current period calculations.
                </div>
                <div className="text-sm text-secondary" style={{ marginBottom: 12 }}>
                  Current period: <strong>{Math.round(currentPeriodPoints)} pts</strong>
                  {state.settings.gamification.monthlyRewardBudget > 0 && (
                    <> · <strong>€{formatEuros(currentPeriodEuros)}</strong></>
                  )}
                  {' '}will be excluded going forward.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowResetConfirm(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }}
                    onClick={() => {
                      dispatch({ type: 'UPDATE_SETTINGS', payload: { periodResetDate: new Date().toISOString().split('T')[0] } });
                      setShowResetConfirm(false);
                    }}
                    type="button"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Motivation</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Your life philosophy..."
              value={editSplash.splashPhilosophyText}
              onChange={e => setEditSplash({ ...editSplash, splashPhilosophyText: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Prize image</label>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => document.getElementById('splash-prize-upload')?.click()}
              type="button"
            >
              {editSplash.splashPrizeImage ? 'Change image' : 'Upload image'}
            </button>
            <input
              id="splash-prize-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setEditSplash({ ...editSplash, splashPrizeImage: reader.result as string });
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            {editSplash.splashPrizeImage && (
              <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                <img
                  src={editSplash.splashPrizeImage}
                  alt="Prize preview"
                  style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditSplash({ ...editSplash, splashPrizeImage: null })}
                  style={{ position: 'absolute', top: 0, right: 0 }}
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Dismiss mode
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${editSplash.splashDismissMode === 'tap' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditSplash({ ...editSplash, splashDismissMode: 'tap' })}
                  type="button"
                >Tap</button>
                <button
                  className={`btn btn-sm ${editSplash.splashDismissMode === 'timed' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditSplash({ ...editSplash, splashDismissMode: 'timed' })}
                  type="button"
                >Timed</button>
              </div>
            </label>
          </div>
          {editSplash.splashDismissMode === 'timed' && (
            <div className="form-group">
              <label className="form-label">Duration (seconds)</label>
              <input
                className="form-input"
                type="number"
                value={editSplashDuration}
                onChange={e => { const v = parseInt(e.target.value, 10); setEditSplashDuration(isNaN(v) ? '' : String(v)); }}
                min="3"
                max="30"
                step="1"
              />
            </div>
          )}
          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="form-label" style={{ marginBottom: 12 }}>Cloud Backup</div>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              Back up to Google Drive
              <button
                className={`toggle-btn ${editDriveEnabled ? 'on' : ''}`}
                onClick={() => setEditDriveEnabled(e => !e)}
                type="button"
              >
                <span className="toggle-knob" />
              </button>
            </label>
            <div className="text-secondary text-sm" style={{ marginBottom: 4 }}>
              Saves to Drive's hidden app folder when you leave the app. Requires Google sign-in via Timeline.
            </div>
            {state.settings.driveLastSynced && (
              <div className="text-secondary text-sm">
                Last synced: {new Date(state.settings.driveLastSynced).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid var(--error)', paddingTop: 16 }}>
            <div className="form-label" style={{ color: 'var(--error)', marginBottom: 12 }}>
              Danger Zone
            </div>
            {!showHardResetConfirm ? (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }}
                onClick={() => { exportData(); setShowHardResetConfirm(true); }}
                type="button"
              >
                Hard Reset
              </button>
            ) : (
              <div style={{ background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)' }}>
                <div className="text-sm" style={{ marginBottom: 8 }}>
                  <strong>All tracking history, scores, wallet transactions and wallet balance will be permanently deleted.</strong>
                </div>
                <div className="text-sm text-secondary" style={{ marginBottom: 12 }}>
                  Your focus areas, projects, templates and settings are preserved. A backup has been downloaded.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowHardResetConfirm(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }}
                    onClick={() => {
                      dispatch({ type: 'HARD_RESET' });
                      setShowHardResetConfirm(false);
                      setShowGameSettings(false);
                    }}
                    type="button"
                  >
                    Delete all history
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowGameSettings(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveGameSettings}>Save</button>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
}
