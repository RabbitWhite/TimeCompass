import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import { formatDuration, getWeekStart, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros } from '../utils.js';
export default function Dashboard() {
    const { state } = useApp();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState(0);
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
    // Period progress
    const periodActualMinutes = state.timeEntries
        .filter(e => {
        const d = new Date(e.startTime);
        return d >= periodStart && d <= pEnd;
    })
        .reduce((s, e) => s + e.duration, 0);
    const periodTargetMinutes = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours * 4 * 60, 0);
    const periodPct = periodTargetMinutes > 0 ? Math.min(1, periodActualMinutes / periodTargetMinutes) : 0;
    return (_jsxs("div", { children: [_jsxs("div", { className: "dash-welcome", children: [_jsx("h2", { children: "LifeTracker" }), _jsx("p", { children: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })] }), state.activeTracking && activeArea && (_jsxs("div", { className: "tracker-banner", style: { background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }, children: [_jsx("div", { className: "tracking-label", children: "Currently tracking" }), _jsx("div", { className: "tracking-area", children: activeArea.name }), _jsx("div", { className: "tracking-time", children: formatDuration(elapsed) }), _jsx("button", { className: "btn btn-sm", onClick: () => navigate('/track'), children: "View Tracker" })] })), gamSettings.enabled && (_jsxs("div", { className: "dash-points-card", children: [_jsxs("div", { className: "dash-points-left", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "var(--warning)", children: _jsx("path", { d: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 17.9V20H7v2h10v-2h-4v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" }) }), _jsxs("div", { children: [_jsx("div", { className: "dash-points-level", children: "Monthly Reward" }), _jsx("div", { className: "dash-points-total", children: budget > 0
                                            ? `Period from ${periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            : `${Math.round(currentScore.totalPoints)} pts this week` })] })] }), _jsx("div", { className: "dash-points-right", children: budget > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dash-points-week", children: ["\u20AC", formatEuros(currentPeriodEuros)] }), _jsxs("div", { className: "dash-points-label", children: ["of \u20AC", formatEuros(budget)] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "dash-points-week", children: Math.round(currentScore.totalPoints) }), _jsx("div", { className: "dash-points-label", children: "pts this week" })] })) })] })), periodTargetMinutes > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Period Progress" }) }), _jsxs("div", { className: "allocation-bar", children: [_jsxs("div", { className: "allocation-header", children: [_jsx("span", { className: "allocation-hours", children: formatDuration(periodActualMinutes) }), _jsx("span", { className: "allocation-hours", children: formatDuration(periodTargetMinutes) })] }), _jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill", style: { width: `${periodPct * 100}%`, background: 'var(--primary)' } }) })] })] })), state.focusAreas.length === 0 && !state.activeTracking && (_jsxs("div", { className: "empty-state mt-16", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }) }), _jsxs("p", { children: ["Welcome to LifeTracker!", _jsx("br", {}), "Start by adding your first focus area."] }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => navigate('/areas'), children: "Add Focus Area" })] }))] }));
}
