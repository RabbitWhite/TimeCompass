import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav.js';
import Dashboard from './pages/Dashboard.js';
import FocusAreas from './pages/FocusAreas.js';
import Timeline from './pages/Timeline.js';
import Tracking from './pages/Tracking.js';
import Statistics from './pages/Statistics.js';
import WeekTemplates from './pages/WeekTemplates.js';
import Modal from './components/Modal.js';
import SplashScreen from './components/SplashScreen.js';
import { useApp, readRecoveryRecord } from './store.js';
import { calculateWeeklyScore, getWeekStart, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, getCompletedPeriodEuros, pointsToEuros, formatEuros, generateId } from './utils.js';
import { getDriveToken, syncToDrive, restoreFromDrive, attemptSilentReauth } from './utils/driveSync.js';
export default function App() {
    const { state, dispatch } = useApp();
    const [showData, setShowData] = useState(false);
    const [showGameSettings, setShowGameSettings] = useState(false);
    const [editSettings, setEditSettings] = useState({
        enabled: state.settings.gamification.enabled,
        monthlyRewardBudget: String(state.settings.gamification.monthlyRewardBudget),
        pointsPerTargetHour: String(state.settings.gamification.pointsPerTargetHour),
        balanceBasePoints: String(state.settings.gamification.balanceBasePoints),
        streakBonusPoints: String(state.settings.gamification.streakBonusPoints),
    });
    const [editSplash, setEditSplash] = useState({
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
    const [driveNeedsReauth, setDriveNeedsReauth] = useState(() => state.settings.driveBackupEnabled && !getDriveToken());
    const fileRef = useRef(null);
    const [importPending, setImportPending] = useState(null);
    const [importError, setImportError] = useState(null);
    const [showDriveRecoveryPrompt, setShowDriveRecoveryPrompt] = useState(false);
    const [driveRecoveryError, setDriveRecoveryError] = useState(null);
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
            if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1))
                streak++;
            else
                break;
        }
        return streak;
    }, [state.weeklyScores]);
    const currentScore = useMemo(() => calculateWeeklyScore(state.focusAreas, state.timeEntries, state.settings.gamification, currentWeekStart, previousStreak), [state.focusAreas, state.timeEntries, state.settings.gamification, currentWeekStart, previousStreak]);
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
    const currentPeriodEuros = pointsToEuros(currentPeriodPoints, maxWeekPoints, state.settings.gamification.monthlyRewardBudget);
    useEffect(() => {
        if (state.focusAreas.length > 0) {
            dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
        }
    }, [currentScore]);
    useEffect(() => {
        const { lastCreditedPeriodIndex, walletBalance, gamification } = state.settings;
        if (!gamification.enabled || gamification.monthlyRewardBudget === 0)
            return;
        if (prevCompletedPeriodIdx < 0)
            return;
        if (lastCreditedPeriodIndex >= prevCompletedPeriodIdx)
            return;
        let balance = walletBalance;
        let lastIdx = lastCreditedPeriodIndex;
        for (let idx = lastCreditedPeriodIndex + 1; idx <= prevCompletedPeriodIdx; idx++) {
            const euros = getCompletedPeriodEuros(state.weeklyScores, idx, maxWeekPoints, gamification.monthlyRewardBudget);
            const tx = {
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
        if (!clientId)
            return;
        try {
            const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.appdata',
                callback: (response) => {
                    if (response.error)
                        return;
                    dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: response.access_token } });
                    setDriveNeedsReauth(false);
                },
            });
            tokenClient?.requestAccessToken();
        }
        catch { /* Google Identity Services not loaded */ }
    };
    // Keep a ref so the visibilitychange handler always sees current state
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => {
        if (!state.settings.driveBackupEnabled)
            return;
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'hidden')
                return;
            const token = getDriveToken();
            if (!token)
                return;
            const s = stateRef.current;
            const { lastSavedTimestamp, settings: { driveLastSynced, driveFileId } } = s;
            // Only upload if local state is newer than last Drive sync
            const hasUnsavedDiff = !driveLastSynced ||
                (lastSavedTimestamp != null && new Date(lastSavedTimestamp) > new Date(driveLastSynced));
            if (!hasUnsavedDiff)
                return;
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
        if (!state.settings.driveBackupEnabled)
            return;
        const doRestore = async (t) => {
            const remote = await restoreFromDrive(t);
            if (!remote)
                return;
            const remoteTs = remote.lastSavedTimestamp;
            const localTs = state.lastSavedTimestamp;
            if (remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs))) {
                dispatch({ type: 'LOAD_STATE', payload: remote });
            }
        };
        const token = getDriveToken();
        if (token) {
            doRestore(token);
            return;
        }
        attemptSilentReauth(state.settings.googleClientId, 'https://www.googleapis.com/auth/drive.appdata', (newToken) => {
            if (!newToken)
                return;
            dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: newToken } });
            setDriveNeedsReauth(false);
            doRestore(newToken);
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount-only, intentional
    function waitForGIS(maxMs = 5000) {
        return new Promise(resolve => {
            const interval = 100;
            const maxAttempts = maxMs / interval;
            let attempts = 0;
            const id = setInterval(() => {
                if (window.google?.accounts?.oauth2) {
                    clearInterval(id);
                    resolve(true);
                    return;
                }
                if (++attempts >= maxAttempts) {
                    clearInterval(id);
                    resolve(false);
                }
            }, interval);
        });
    }
    // On mount: if local state looks blank and a recovery record says Drive was enabled,
    // attempt silent re-auth and restore. Falls back to a manual-restore banner.
    useEffect(() => {
        const isBlank = state.focusAreas.length === 0 || !state.settings.googleClientId;
        if (!isBlank)
            return;
        const record = readRecoveryRecord();
        if (!record || !record.driveBackupEnabled)
            return;
        const doRecovery = (token) => {
            sessionStorage.setItem('googleAccessToken', token);
            dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: token } });
            restoreFromDrive(token).then((remote) => {
                if (!remote)
                    return;
                const remoteTs = remote.lastSavedTimestamp;
                const localTs = state.lastSavedTimestamp;
                if (remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs))) {
                    dispatch({ type: 'LOAD_STATE', payload: remote });
                    setShowDriveRecoveryPrompt(false);
                }
            });
        };
        (async () => {
            const gisReady = await waitForGIS();
            if (!gisReady) {
                setShowDriveRecoveryPrompt(true);
                return;
            }
            attemptSilentReauth(record.clientId, 'https://www.googleapis.com/auth/drive.appdata', (token) => {
                if (token) {
                    doRecovery(token);
                }
                else {
                    setShowDriveRecoveryPrompt(true);
                }
            });
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount-only, intentional
    const saveGameSettings = () => {
        dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: {
                enabled: editSettings.enabled,
                monthlyRewardBudget: parseInt(editSettings.monthlyRewardBudget, 10) || 0,
                pointsPerTargetHour: parseInt(editSettings.pointsPerTargetHour, 10) || 0,
                balanceBasePoints: parseInt(editSettings.balanceBasePoints, 10) || 0,
                streakBonusPoints: parseInt(editSettings.streakBonusPoints, 10) || 0,
            } });
        dispatch({ type: 'UPDATE_SETTINGS', payload: {
                ...editSplash,
                splashDuration: Math.min(30, Math.max(3, parseInt(editSplashDuration, 10) || 5)),
                driveBackupEnabled: editDriveEnabled,
            } });
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
    const importData = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data.focusAreas) || data.focusAreas.length === 0) {
                    setImportError('This file contains no focus areas. It may be empty or not a valid Time Compass backup. Import cancelled to protect your existing data.');
                    return;
                }
                if (!Array.isArray(data.timeEntries)) {
                    setImportError('This file is missing required fields. Import cancelled to protect your existing data.');
                    return;
                }
                setImportPending(data);
            }
            catch {
                setImportError('This file could not be parsed. It may be corrupted or not a valid JSON backup.');
            }
        };
        reader.readAsText(file);
        if (fileRef.current)
            fileRef.current.value = '';
    };
    const confirmImport = () => {
        if (!importPending)
            return;
        exportData();
        dispatch({ type: 'LOAD_STATE', payload: importPending });
        setImportPending(null);
        setShowData(false);
    };
    return (_jsxs(_Fragment, { children: [_jsx(SplashScreen, {}), _jsxs("div", { className: "app-layout", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "Time Compass" }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => {
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
                                        }, children: _jsx("svg", { viewBox: "0 0 24 24", width: "24", height: "24", fill: "currentColor", children: _jsx("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" }) }) }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setShowData(true), children: _jsx("svg", { viewBox: "0 0 24 24", width: "24", height: "24", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }) })] })] }), swUpdateReady && (_jsxs("div", { className: "update-banner", children: [_jsx("span", { children: "New version available" }), _jsx("button", { className: "btn btn-sm", onClick: () => window.location.reload(), children: "Update" })] })), driveNeedsReauth && (_jsxs("div", { className: "reauth-banner", children: [_jsx("span", { children: "Drive backup needs reconnection" }), state.settings.googleClientId ? (_jsx("button", { className: "btn btn-sm reauth-banner-btn", onClick: reauthDrive, children: "Sign in" })) : (_jsx("span", { className: "reauth-banner-hint", children: "Set a Client ID in Timeline" }))] })), showDriveRecoveryPrompt && (_jsxs("div", { style: {
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
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, children: [_jsx("span", { className: "text-sm", children: "Your data is on Google Drive — tap to restore" }), _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => {
                                            const record = readRecoveryRecord();
                                            if (!record)
                                                return;
                                            setDriveRecoveryError(null);
                                            if (!window.google?.accounts?.oauth2) {
                                                setDriveRecoveryError('Google sign-in is not ready yet, please wait a moment and try again.');
                                                return;
                                            }
                                            attemptSilentReauth(record.clientId, 'https://www.googleapis.com/auth/drive.appdata', (token) => {
                                                if (!token) {
                                                    setDriveRecoveryError('Sign-in failed. Please try again.');
                                                    return;
                                                }
                                                sessionStorage.setItem('googleAccessToken', token);
                                                dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: token } });
                                                restoreFromDrive(token).then((remote) => {
                                                    if (!remote) {
                                                        setDriveRecoveryError('No backup found on Drive.');
                                                        return;
                                                    }
                                                    dispatch({ type: 'LOAD_STATE', payload: remote });
                                                    setShowDriveRecoveryPrompt(false);
                                                });
                                            });
                                        }, children: "Restore" })] }), driveRecoveryError && (_jsx("span", { className: "text-sm", style: { color: 'var(--error)' }, children: driveRecoveryError }))] })), _jsx("main", { className: "app-content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/track", replace: true }) }), _jsx(Route, { path: "/status", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/areas", element: _jsx(FocusAreas, {}) }), _jsx(Route, { path: "/timeline", element: _jsx(Timeline, {}) }), _jsx(Route, { path: "/track", element: _jsx(Tracking, {}) }), _jsx(Route, { path: "/stats", element: _jsx(Statistics, {}) }), _jsx(Route, { path: "/templates", element: _jsx(WeekTemplates, {}) })] }) }), _jsx(BottomNav, {}), showData && (_jsxs(Modal, { title: "Data Management", onClose: () => { setShowData(false); setImportPending(null); setImportError(null); }, children: [importError ? (_jsxs("div", { style: { background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)', marginBottom: 16 }, children: [_jsx("div", { className: "text-sm", style: { color: 'var(--error)', marginBottom: 8 }, children: _jsx("strong", { children: "Import failed" }) }), _jsx("div", { className: "text-sm", style: { marginBottom: 12 }, children: importError }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setImportError(null), children: "Dismiss" })] })) : importPending ? (_jsxs("div", { style: { background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--warning, #f59e0b)' }, children: [_jsx("div", { className: "text-sm", style: { marginBottom: 12 }, children: _jsx("strong", { children: "Review before importing" }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 16px', marginBottom: 12, fontSize: 13 }, children: [_jsx("span", {}), "                           ", _jsx("strong", { children: "Current" }), "                     ", _jsx("strong", { children: "File" }), _jsx("span", { children: "Focus areas" }), "           ", _jsx("span", { children: state.focusAreas.length }), "        ", _jsx("span", { children: importPending.focusAreas.length }), _jsx("span", { children: "Time entries" }), "          ", _jsx("span", { children: state.timeEntries.length }), "       ", _jsx("span", { children: importPending.timeEntries.length }), _jsx("span", { children: "Wallet transactions" }), "   ", _jsx("span", { children: state.walletTransactions.length }), " ", _jsx("span", { children: Array.isArray(importPending.walletTransactions) ? importPending.walletTransactions.length : 0 })] }), _jsxs("div", { className: "text-sm", style: { marginBottom: 12 }, children: [_jsx("strong", { children: "Importing will permanently replace all current data." }), " Your current state will be downloaded as a backup file automatically before importing."] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setImportPending(null), children: "Cancel" }), _jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: confirmImport, children: "Download backup & import" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-secondary text-sm mb-16", children: "Your data is stored in the browser. Export a backup to keep it safe across cache clears." }), _jsxs("button", { className: "btn btn-primary btn-block mb-16", onClick: exportData, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }), "Export Backup (JSON)"] }), _jsxs("button", { className: "btn btn-secondary btn-block", onClick: () => fileRef.current?.click(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" }) }), "Import Backup"] }), _jsx("p", { className: "text-secondary text-sm mt-16", style: { fontSize: 11 }, children: "Tip: Export regularly so you can restore after clearing browser data." })] })), _jsx("input", { ref: fileRef, type: "file", accept: ".json", style: { display: 'none' }, onChange: importData })] })), showGameSettings && (_jsxs(Modal, { title: "Reward Settings", onClose: () => { setShowGameSettings(false); setShowResetConfirm(false); setShowHardResetConfirm(false); }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Monthly reward budget (€)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.monthlyRewardBudget, onChange: e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, monthlyRewardBudget: isNaN(v) ? '' : String(v) }); }, min: "0", step: "1" }), _jsx("div", { className: "text-secondary text-sm mt-8", children: "Prize money available per 4-week period. Reaching 100% of your weekly targets every week earns the full amount. Set to 0 to disable financial tracking." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Points per target hour" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.pointsPerTargetHour, onChange: e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, pointsPerTargetHour: isNaN(v) ? '' : String(v) }); }, min: "0", step: "1" }), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Affects proportional reward calculation. (e.g., 10h target at 100% = ", (parseInt(editSettings.pointsPerTargetHour, 10) || 0) * 10, " pts)"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Balance bonus (per area)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.balanceBasePoints, onChange: e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, balanceBasePoints: isNaN(v) ? '' : String(v) }); }, min: "0", step: "1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Streak bonus (per consecutive week)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.streakBonusPoints, onChange: e => { const v = parseInt(e.target.value, 10); setEditSettings({ ...editSettings, streakBonusPoints: isNaN(v) ? '' : String(v) }); }, min: "0", step: "1" })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Gamification enabled", _jsx("button", { className: `toggle-btn ${editSettings.enabled ? 'on' : ''}`, onClick: () => setEditSettings({ ...editSettings, enabled: !editSettings.enabled }), children: _jsx("span", { className: "toggle-knob" }) })] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Period" }), _jsxs("div", { className: "text-secondary text-sm", style: { marginBottom: 8 }, children: ["Current period started", ' ', state.settings.periodResetDate
                                                ? new Date(state.settings.periodResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                : currentPeriodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), state.settings.periodResetDate && ' (manual reset)'] }), !showResetConfirm ? (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => setShowResetConfirm(true), type: "button", children: "Reset Current Period" }), state.settings.periodResetDate && (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => dispatch({ type: 'UPDATE_SETTINGS', payload: { periodResetDate: null } }), type: "button", children: "Clear Reset" }))] })) : (_jsxs("div", { style: { background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)' }, children: [_jsx("div", { className: "text-sm", style: { marginBottom: 8 }, children: "This starts a new period from today. Old entries are kept but excluded from current period calculations." }), _jsxs("div", { className: "text-sm text-secondary", style: { marginBottom: 12 }, children: ["Current period: ", _jsxs("strong", { children: [Math.round(currentPeriodPoints), " pts"] }), state.settings.gamification.monthlyRewardBudget > 0 && (_jsxs(_Fragment, { children: [" · ", _jsxs("strong", { children: ["€", formatEuros(currentPeriodEuros)] })] })), ' ', "will be excluded going forward."] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowResetConfirm(false), type: "button", children: "Cancel" }), _jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => {
                                                            dispatch({ type: 'UPDATE_SETTINGS', payload: { periodResetDate: new Date().toISOString().split('T')[0] } });
                                                            setShowResetConfirm(false);
                                                        }, type: "button", children: "Confirm Reset" })] })] }))] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Motivation" }), _jsx("textarea", { className: "form-input", rows: 4, placeholder: "Your life philosophy...", value: editSplash.splashPhilosophyText, onChange: e => setEditSplash({ ...editSplash, splashPhilosophyText: e.target.value }), style: { resize: 'vertical' } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Prize image" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => document.getElementById('splash-prize-upload')?.click(), type: "button", children: editSplash.splashPrizeImage ? 'Change image' : 'Upload image' }), _jsx("input", { id: "splash-prize-upload", type: "file", accept: "image/*", style: { display: 'none' }, onChange: e => {
                                            const file = e.target.files?.[0];
                                            if (!file)
                                                return;
                                            const reader = new FileReader();
                                            reader.onload = () => setEditSplash({ ...editSplash, splashPrizeImage: reader.result });
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        } }), editSplash.splashPrizeImage && (_jsxs("div", { style: { marginTop: 8, position: 'relative', display: 'inline-block' }, children: [_jsx("img", { src: editSplash.splashPrizeImage, alt: "Prize preview", style: { maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 } }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditSplash({ ...editSplash, splashPrizeImage: null }), style: { position: 'absolute', top: 0, right: 0 }, type: "button", children: "✕" })] }))] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Dismiss mode", _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: `btn btn-sm ${editSplash.splashDismissMode === 'tap' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setEditSplash({ ...editSplash, splashDismissMode: 'tap' }), type: "button", children: "Tap" }), _jsx("button", { className: `btn btn-sm ${editSplash.splashDismissMode === 'timed' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setEditSplash({ ...editSplash, splashDismissMode: 'timed' }), type: "button", children: "Timed" })] })] }) }), editSplash.splashDismissMode === 'timed' && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Duration (seconds)" }), _jsx("input", { className: "form-input", type: "number", value: editSplashDuration, onChange: e => { const v = parseInt(e.target.value, 10); setEditSplashDuration(isNaN(v) ? '' : String(v)); }, min: "3", max: "30", step: "1" })] })), _jsxs("div", { style: { marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }, children: [_jsx("div", { className: "form-label", style: { marginBottom: 12 }, children: "Cloud Backup" }), _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: ["Back up to Google Drive", _jsx("button", { className: `toggle-btn ${editDriveEnabled ? 'on' : ''}`, onClick: () => setEditDriveEnabled(e => !e), type: "button", children: _jsx("span", { className: "toggle-knob" }) })] }), _jsx("div", { className: "text-secondary text-sm", style: { marginBottom: 4 }, children: "Saves to Drive's hidden app folder when you leave the app. Requires Google sign-in via Timeline." }), state.settings.driveLastSynced && (_jsxs("div", { className: "text-secondary text-sm", children: ["Last synced: ", new Date(state.settings.driveLastSynced).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })] }))] }), _jsxs("div", { style: { marginTop: 24, borderTop: '1px solid var(--error)', paddingTop: 16 }, children: [_jsx("div", { className: "form-label", style: { color: 'var(--error)', marginBottom: 12 }, children: "Danger Zone" }), !showHardResetConfirm ? (_jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => { exportData(); setShowHardResetConfirm(true); }, type: "button", children: "Hard Reset" })) : (_jsxs("div", { style: { background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)' }, children: [_jsx("div", { className: "text-sm", style: { marginBottom: 8 }, children: _jsx("strong", { children: "All tracking history, scores, wallet transactions and wallet balance will be permanently deleted." }) }), _jsx("div", { className: "text-sm text-secondary", style: { marginBottom: 12 }, children: "Your focus areas, projects, templates and settings are preserved. A backup has been downloaded." }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowHardResetConfirm(false), type: "button", children: "Cancel" }), _jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => {
                                                            dispatch({ type: 'HARD_RESET' });
                                                            setShowHardResetConfirm(false);
                                                            setShowGameSettings(false);
                                                        }, type: "button", children: "Delete all history" })] })] }))] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowGameSettings(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: saveGameSettings, children: "Save" })] })] }))] })] }));
}
