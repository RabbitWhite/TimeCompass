import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { formatDuration, getWeekStart, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros, generateId } from '../utils';
export default function Dashboard() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState(0);
    const [showSpend, setShowSpend] = useState(false);
    const [spendAmount, setSpendAmount] = useState('');
    const [spendNote, setSpendNote] = useState('');
    const [showLog, setShowLog] = useState(false);
    const spendInputRef = useRef(null);
    useEffect(() => {
        if (!state.activeTracking)
            return;
        const tick = () => {
            const start = new Date(state.activeTracking.startTime).getTime();
            setElapsed(Math.floor((Date.now() - start) / 60000));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state.activeTracking]);
    const activeArea = state.activeTracking
        ? state.focusAreas.find(a => a.id === state.activeTracking.focusAreaId)
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
            }
            else
                break;
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
    return (_jsxs("div", { children: [_jsxs("div", { className: "dash-welcome", children: [_jsx("h2", { children: "LifeTracker" }), _jsx("p", { children: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })] }), state.activeTracking && activeArea && (_jsxs("div", { className: "tracker-banner", style: { background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }, children: [_jsx("div", { className: "tracking-label", children: "Currently tracking" }), _jsx("div", { className: "tracking-area", children: activeArea.name }), _jsx("div", { className: "tracking-time", children: formatDuration(elapsed) }), _jsx("button", { className: "btn btn-sm", onClick: () => navigate('/track'), children: "View Tracker" })] })), gamSettings.enabled && (_jsxs("div", { className: "dash-points-card", children: [_jsxs("div", { className: "dash-points-left", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "var(--warning)", children: _jsx("path", { d: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 17.9V20H7v2h10v-2h-4v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" }) }), _jsxs("div", { children: [_jsx("div", { className: "dash-points-level", children: "Monthly Reward" }), _jsx("div", { className: "dash-points-total", children: budget > 0
                                            ? `Period from ${periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            : `${Math.round(currentScore.totalPoints)} pts this week` })] })] }), _jsx("div", { className: "dash-points-right", children: budget > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dash-points-week", children: ["\u20AC", formatEuros(currentPeriodEuros)] }), _jsxs("div", { className: "dash-points-label", children: ["of \u20AC", formatEuros(budget)] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "dash-points-week", children: Math.round(currentScore.totalPoints) }), _jsx("div", { className: "dash-points-label", children: "pts this week" })] })) })] })), budget > 0 && (_jsxs("div", { className: "dash-points-card", style: { marginTop: 8 }, children: [_jsxs("div", { className: "dash-points-left", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "var(--success)", children: _jsx("path", { d: "M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" }) }), _jsxs("div", { children: [_jsx("div", { className: "dash-points-level", children: "Prize Wallet" }), _jsx("div", { className: "dash-points-total", children: "Accumulated earnings" })] })] }), _jsxs("div", { className: "dash-points-right", children: [_jsxs("div", { className: "dash-points-week", children: ["\u20AC", formatEuros(state.settings.walletBalance)] }), _jsx("button", { className: "btn btn-sm btn-primary", style: { marginTop: 4 }, onClick: () => { setSpendAmount(''); setSpendNote(''); setShowSpend(true); }, children: "Use Prize Money" })] })] })), budget > 0 && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("button", { className: "btn btn-ghost btn-sm", style: { fontSize: 12, padding: '2px 8px' }, onClick: () => setShowLog(l => !l), children: [showLog ? 'Hide' : 'Show', " transaction log"] }), showLog && (_jsxs("div", { style: { marginTop: 8 }, children: [state.walletTransactions.length === 0 && (_jsx("p", { className: "text-secondary text-sm", children: "No transactions yet." })), state.walletTransactions.slice(0, 10).map(tx => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13 }, children: tx.note }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-secondary)' }, children: new Date(tx.date).toLocaleDateString() })] }), _jsxs("div", { style: { fontWeight: 600, color: tx.type === 'credit' ? 'var(--success)' : 'var(--error)' }, children: [tx.type === 'credit' ? '+' : '-', "\u20AC", formatEuros(tx.amount)] })] }, tx.id)))] }))] })), periodTargetMinutes > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Period Progress" }) }), _jsxs("div", { className: "allocation-bar", children: [_jsxs("div", { className: "allocation-header", children: [_jsx("span", { className: "allocation-hours", children: formatDuration(periodActualMinutes) }), _jsx("span", { className: "allocation-hours", children: formatDuration(periodTargetMinutes) })] }), _jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill", style: { width: `${periodPct * 100}%`, background: 'var(--primary)' } }) })] })] })), state.focusAreas.length === 0 && !state.activeTracking && (_jsxs("div", { className: "empty-state mt-16", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }) }), _jsxs("p", { children: ["Welcome to LifeTracker!", _jsx("br", {}), "Start by adding your first focus area."] }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => navigate('/areas'), children: "Add Focus Area" })] })), showSpend && (_jsxs(Modal, { title: "Use Prize Money", onClose: () => setShowSpend(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Amount (\u20AC)" }), _jsx("input", { ref: spendInputRef, className: "form-input", type: "number", min: "0.01", step: "0.01", value: spendAmount, onChange: e => setSpendAmount(e.target.value), autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Note (optional)" }), _jsx("input", { className: "form-input", type: "text", placeholder: "What did you buy?", value: spendNote, onChange: e => setSpendNote(e.target.value) })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowSpend(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", disabled: !spendAmount || parseFloat(spendAmount) <= 0, onClick: () => {
                                    const amount = parseFloat(spendAmount);
                                    if (!amount || amount <= 0)
                                        return;
                                    const tx = {
                                        id: generateId(),
                                        date: new Date().toISOString(),
                                        amount,
                                        note: spendNote.trim() || 'Purchase',
                                        type: 'debit',
                                    };
                                    dispatch({ type: 'ADD_WALLET_TRANSACTION', payload: tx });
                                    dispatch({ type: 'UPDATE_WALLET_SETTINGS', payload: { walletBalance: Math.max(0, state.settings.walletBalance - amount) } });
                                    setShowSpend(false);
                                }, children: "Confirm" })] })] }))] }));
}
