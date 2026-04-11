import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { calculateWeeklyScore, getWeekStart, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, getCompletedPeriodEuros, pointsToEuros, formatEuros, generateId } from './utils';
import './App.css';
export default function App() {
    const { state, dispatch } = useApp();
    const [showData, setShowData] = useState(false);
    const [showGameSettings, setShowGameSettings] = useState(false);
    const [editSettings, setEditSettings] = useState({ ...state.settings.gamification });
    const [editSplash, setEditSplash] = useState({
        splashPhilosophyText: state.settings.splashPhilosophyText,
        splashPrizeImage: state.settings.splashPrizeImage,
        splashDismissMode: state.settings.splashDismissMode,
        splashDuration: state.settings.splashDuration,
    });
    const [swUpdateReady, setSwUpdateReady] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const fileRef = useRef(null);
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
    const saveGameSettings = () => {
        dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: editSettings });
        dispatch({ type: 'UPDATE_SETTINGS', payload: editSplash });
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
    const importData = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (data.focusAreas && data.timeEntries) {
                    dispatch({ type: 'LOAD_STATE', payload: data });
                    setShowData(false);
                }
            }
            catch { /* invalid file */ }
        };
        reader.readAsText(file);
        if (fileRef.current)
            fileRef.current.value = '';
    };
    return (_jsxs(_Fragment, { children: [_jsx(SplashScreen, {}), _jsxs("div", { className: "app-layout", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "LifeTracker" }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => {
                                            setEditSettings({ ...state.settings.gamification });
                                            setEditSplash({
                                                splashPhilosophyText: state.settings.splashPhilosophyText,
                                                splashPrizeImage: state.settings.splashPrizeImage,
                                                splashDismissMode: state.settings.splashDismissMode,
                                                splashDuration: state.settings.splashDuration,
                                            });
                                            setShowGameSettings(true);
                                        }, children: _jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", fill: "currentColor", children: _jsx("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" }) }) }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setShowData(true), children: _jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }) })] })] }), swUpdateReady && (_jsxs("div", { className: "update-banner", children: [_jsx("span", { children: "New version available" }), _jsx("button", { className: "btn btn-sm", onClick: () => window.location.reload(), children: "Update" })] })), _jsx("main", { className: "app-content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/track", replace: true }) }), _jsx(Route, { path: "/status", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/areas", element: _jsx(FocusAreas, {}) }), _jsx(Route, { path: "/timeline", element: _jsx(Timeline, {}) }), _jsx(Route, { path: "/track", element: _jsx(Tracking, {}) }), _jsx(Route, { path: "/stats", element: _jsx(Statistics, {}) }), _jsx(Route, { path: "/templates", element: _jsx(WeekTemplates, {}) })] }) }), _jsx(BottomNav, {}), showData && (_jsxs(Modal, { title: "Data Management", onClose: () => setShowData(false), children: [_jsx("p", { className: "text-secondary text-sm mb-16", children: "Your data is stored in the browser. Export a backup to keep it safe across cache clears." }), _jsxs("button", { className: "btn btn-primary btn-block mb-16", onClick: exportData, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }), "Export Backup (JSON)"] }), _jsxs("button", { className: "btn btn-secondary btn-block", onClick: () => fileRef.current?.click(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" }) }), "Import Backup"] }), _jsx("input", { ref: fileRef, type: "file", accept: ".json", style: { display: 'none' }, onChange: importData }), _jsx("p", { className: "text-secondary text-sm mt-16", style: { fontSize: 11 }, children: "Tip: Export regularly so you can restore after clearing browser data." })] })), showGameSettings && (_jsxs(Modal, { title: "Reward Settings", onClose: () => { setShowGameSettings(false); setShowResetConfirm(false); }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Monthly reward budget (\u20AC)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.monthlyRewardBudget, onChange: e => setEditSettings({ ...editSettings, monthlyRewardBudget: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsx("div", { className: "text-secondary text-sm mt-8", children: "Prize money available per 4-week period. Reaching 100% of your weekly targets every week earns the full amount. Set to 0 to disable financial tracking." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Points per target hour" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.pointsPerTargetHour, onChange: e => setEditSettings({ ...editSettings, pointsPerTargetHour: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Affects proportional reward calculation. (e.g., 10h target at 100% = ", editSettings.pointsPerTargetHour * 10, " pts)"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Balance bonus (per area)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.balanceBasePoints, onChange: e => setEditSettings({ ...editSettings, balanceBasePoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Streak bonus (per consecutive week)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.streakBonusPoints, onChange: e => setEditSettings({ ...editSettings, streakBonusPoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Gamification enabled", _jsx("button", { className: `toggle-btn ${editSettings.enabled ? 'on' : ''}`, onClick: () => setEditSettings({ ...editSettings, enabled: !editSettings.enabled }), children: _jsx("span", { className: "toggle-knob" }) })] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Period" }), _jsxs("div", { className: "text-secondary text-sm", style: { marginBottom: 8 }, children: ["Current period started", ' ', state.settings.periodResetDate
                                                ? new Date(state.settings.periodResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                : currentPeriodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), state.settings.periodResetDate && ' (manual reset)'] }), !showResetConfirm ? (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => setShowResetConfirm(true), type: "button", children: "Reset Current Period" }), state.settings.periodResetDate && (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => dispatch({ type: 'UPDATE_SETTINGS', payload: { periodResetDate: null } }), type: "button", children: "Clear Reset" }))] })) : (_jsxs("div", { style: { background: 'var(--surface-alt, var(--surface))', borderRadius: 8, padding: 12, border: '1px solid var(--error)' }, children: [_jsx("div", { className: "text-sm", style: { marginBottom: 8 }, children: "This starts a new period from today. Old entries are kept but excluded from current period calculations." }), _jsxs("div", { className: "text-sm text-secondary", style: { marginBottom: 12 }, children: ["Current period: ", _jsxs("strong", { children: [Math.round(currentPeriodPoints), " pts"] }), state.settings.gamification.monthlyRewardBudget > 0 && (_jsxs(_Fragment, { children: [" \u00B7 ", _jsxs("strong", { children: ["\u20AC", formatEuros(currentPeriodEuros)] })] })), ' ', "will be excluded going forward."] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowResetConfirm(false), type: "button", children: "Cancel" }), _jsx("button", { className: "btn btn-sm", style: { background: 'var(--error)', color: '#fff', borderColor: 'var(--error)' }, onClick: () => {
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
                                        } }), editSplash.splashPrizeImage && (_jsxs("div", { style: { marginTop: 8, position: 'relative', display: 'inline-block' }, children: [_jsx("img", { src: editSplash.splashPrizeImage, alt: "Prize preview", style: { maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 } }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditSplash({ ...editSplash, splashPrizeImage: null }), style: { position: 'absolute', top: 0, right: 0 }, type: "button", children: "\u2715" })] }))] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Dismiss mode", _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: `btn btn-sm ${editSplash.splashDismissMode === 'tap' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setEditSplash({ ...editSplash, splashDismissMode: 'tap' }), type: "button", children: "Tap" }), _jsx("button", { className: `btn btn-sm ${editSplash.splashDismissMode === 'timed' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setEditSplash({ ...editSplash, splashDismissMode: 'timed' }), type: "button", children: "Timed" })] })] }) }), editSplash.splashDismissMode === 'timed' && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Duration (seconds)" }), _jsx("input", { className: "form-input", type: "number", value: editSplash.splashDuration, onChange: e => setEditSplash({ ...editSplash, splashDuration: Math.min(30, Math.max(3, parseInt(e.target.value) || 5)) }), min: "3", max: "30", step: "1" })] })), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowGameSettings(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: saveGameSettings, children: "Save" })] })] }))] })] }));
}
