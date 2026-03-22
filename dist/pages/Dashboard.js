import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import { formatDuration, isThisWeek, getWeekStart, formatTime, formatDate, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros } from '../utils.js';
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
    const weekEntries = state.timeEntries.filter(e => isThisWeek(e.startTime));
    const totalMinutes = weekEntries.reduce((s, e) => s + e.duration, 0);
    const todayEntries = weekEntries.filter(e => {
        const d = new Date(e.startTime);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    });
    const todayMinutes = todayEntries.reduce((s, e) => s + e.duration, 0);
    const totalTarget = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours, 0);
    const activeArea = state.activeTracking
        ? state.focusAreas.find(a => a.id === state.activeTracking.focusAreaId)
        : null;
    const upcomingEvents = state.calendarEvents
        .filter(e => new Date(e.start) > new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 3);
    const areaHours = state.focusAreas.map(area => {
        const mins = weekEntries
            .filter(e => e.focusAreaId === area.id)
            .reduce((s, e) => s + e.duration, 0);
        return { area, mins, target: area.weeklyTargetHours * 60 };
    });
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
    const { start: periodStart } = getPeriodDateRange(currentPeriodIdx);
    const budget = gamSettings.monthlyRewardBudget;
    return (_jsxs("div", { children: [_jsxs("div", { className: "dash-welcome", children: [_jsx("h2", { children: "LifeTracker" }), _jsx("p", { children: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })] }), state.activeTracking && activeArea && (_jsxs("div", { className: "tracker-banner", style: { background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }, children: [_jsx("div", { className: "tracking-label", children: "Currently tracking" }), _jsx("div", { className: "tracking-area", children: activeArea.name }), _jsx("div", { className: "tracking-time", children: formatDuration(elapsed) }), _jsx("button", { className: "btn btn-sm", onClick: () => navigate('/track'), children: "View Tracker" })] })), _jsxs("div", { className: "dash-summary", children: [_jsxs("div", { className: "dash-stat", children: [_jsx("div", { className: "value", children: formatDuration(todayMinutes) }), _jsx("div", { className: "label", children: "Today" })] }), _jsxs("div", { className: "dash-stat", children: [_jsx("div", { className: "value", children: formatDuration(totalMinutes) }), _jsx("div", { className: "label", children: "This Week" })] }), _jsxs("div", { className: "dash-stat", children: [_jsxs("div", { className: "value", children: [totalTarget, "h"] }), _jsx("div", { className: "label", children: "Target" })] })] }), gamSettings.enabled && (_jsxs("div", { className: "dash-points-card", onClick: () => navigate('/gamification'), children: [_jsxs("div", { className: "dash-points-left", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "var(--warning)", children: _jsx("path", { d: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 17.9V20H7v2h10v-2h-4v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" }) }), _jsxs("div", { children: [_jsx("div", { className: "dash-points-level", children: "Monthly Reward" }), _jsx("div", { className: "dash-points-total", children: budget > 0
                                            ? `Period from ${periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            : `${Math.round(currentScore.totalPoints)} pts this week` })] })] }), _jsx("div", { className: "dash-points-right", children: budget > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dash-points-week", children: ["\u20AC", formatEuros(currentPeriodEuros)] }), _jsxs("div", { className: "dash-points-label", children: ["of \u20AC", formatEuros(budget)] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "dash-points-week", children: Math.round(currentScore.totalPoints) }), _jsx("div", { className: "dash-points-label", children: "pts this week" })] })) })] })), areaHours.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header", children: _jsx("span", { className: "section-title", children: "Weekly Progress" }) }), areaHours.map(({ area, mins, target }) => (_jsxs("div", { className: "allocation-bar", children: [_jsxs("div", { className: "allocation-header", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color } }), area.name] }), _jsxs("span", { className: "allocation-hours", children: [formatDuration(mins), " / ", area.weeklyTargetHours, "h"] })] }), _jsxs("div", { className: "bar-track", children: [_jsx("div", { className: "bar-fill", style: {
                                            width: `${Math.min(100, target > 0 ? (mins / target) * 100 : 0)}%`,
                                            background: area.color,
                                        } }), target > 0 && (_jsx("div", { className: "bar-target", style: { left: '100%' } }))] })] }, area.id)))] })), upcomingEvents.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Upcoming" }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => navigate('/timeline'), children: "View all" })] }), upcomingEvents.map(event => {
                        const linkedArea = state.focusAreas.find(a => a.id === event.focusAreaId);
                        return (_jsxs("div", { className: "event-card", children: [_jsx("span", { className: "event-time", children: formatTime(event.start) }), _jsx("span", { className: "event-dot", style: { background: linkedArea?.color || 'var(--text-muted)' } }), _jsxs("div", { className: "event-info", children: [_jsx("div", { className: "event-title truncate", children: event.title }), _jsxs("div", { className: "event-desc", children: [formatDate(event.start), linkedArea && ` \u2022 ${linkedArea.name}`] })] })] }, event.id));
                    })] })), state.focusAreas.length === 0 && !state.activeTracking && (_jsxs("div", { className: "empty-state mt-16", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }) }), _jsxs("p", { children: ["Welcome to LifeTracker!", _jsx("br", {}), "Start by adding your first focus area."] }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => navigate('/areas'), children: "Add Focus Area" })] }))] }));
}
