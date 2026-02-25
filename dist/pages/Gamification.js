import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { calculateWeeklyScore, getWeekStart, formatDuration, getPeriodIndex, getPeriodDateRange, getWeekWithinPeriod, computeMaxWeekPoints, pointsToEuros, formatEuros, } from '../utils.js';
export default function Gamification() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    const gamSettings = state.settings.gamification;
    const [editSettings, setEditSettings] = useState({ ...gamSettings });
    // ── Current week live score ───────────────────────────────────────────────
    const currentWeekStart = getWeekStart();
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
    const currentScore = useMemo(() => calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak), [state.focusAreas, state.timeEntries, gamSettings, previousStreak]);
    useEffect(() => {
        if (state.focusAreas.length > 0) {
            dispatch({ type: 'SAVE_WEEKLY_SCORE', payload: currentScore });
        }
    }, [currentScore]);
    // ── Reward period calculations ────────────────────────────────────────────
    const maxWeekPts = useMemo(() => computeMaxWeekPoints(state.focusAreas, gamSettings), [state.focusAreas, gamSettings]);
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
        const byPeriod = new Map(); // periodIdx → totalPoints
        for (const s of state.weeklyScores) {
            const idx = getPeriodIndex(new Date(s.weekStart));
            if (idx >= currentPeriodIdx)
                continue;
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
    const fmtDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!gamSettings.enabled) {
        return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/'), children: "\u2190 Dashboard" }), _jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }) }), _jsx("p", { children: "Gamification is disabled." }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: { enabled: true } }), children: "Enable" })] })] }));
    }
    return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/'), children: "\u2190 Dashboard" }), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Monthly Reward" }), _jsxs("button", { className: "btn btn-ghost btn-sm", onClick: () => { setEditSettings({ ...gamSettings }); setShowSettings(true); }, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" }) }), "Settings"] })] }), _jsx("div", { className: "score-card", children: budget > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "score-total", children: [_jsxs("span", { className: "score-number", style: { fontSize: 36 }, children: ["\u20AC", formatEuros(currentPeriodEuros)] }), _jsx("span", { className: "score-unit", children: "earned this period" })] }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill", style: {
                                            width: `${periodProgressPct * 100}%`,
                                            background: periodProgressPct >= 1 ? 'var(--success)' : 'var(--primary)',
                                        } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }, children: [_jsx("span", { children: "\u20AC0" }), _jsxs("span", { style: { fontWeight: 600, color: 'var(--text)' }, children: [Math.round(periodProgressPct * 100), "% of \u20AC", formatEuros(budget)] }), _jsxs("span", { children: ["\u20AC", formatEuros(budget)] })] })] }), _jsxs("div", { style: { marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }, children: [fmtDate(periodStart), " \u2013 ", fmtDate(periodEnd), '  •  ', "Week ", weekWithinPeriod, " of 4"] }), totalAcquiredEuros > 0 && (_jsxs("div", { style: {
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 13,
                            }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "Total acquired (past periods)" }), _jsxs("span", { style: { fontWeight: 700, color: 'var(--success)' }, children: ["\u20AC", formatEuros(totalAcquiredEuros)] })] }))] })) : (_jsxs("div", { style: { textAlign: 'center', padding: '8px 0' }, children: [_jsx("div", { style: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }, children: "Set a monthly reward budget to track your financial incentive. Points still accumulate in the background." }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => { setEditSettings({ ...gamSettings }); setShowSettings(true); }, children: "Set Budget" })] })) }), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "This Week" }), budget > 0 && maxWeekPts > 0 && (_jsxs("span", { className: "text-secondary text-sm", children: ["~\u20AC", formatEuros(pointsToEuros(currentScore.totalPoints, maxWeekPts, budget / 4)), " so far"] }))] }), _jsx("div", { className: "score-card", children: _jsxs("div", { className: "score-breakdown", children: [_jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--success)", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }), "Achievement"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.achievementPoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--primary)", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" }) }), "Balance (", Math.round(currentScore.balanceRatio * 100), "%)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.balancePoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--warning)", children: _jsx("path", { d: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51L12.96 17.55 11 21z" }) }), "Streak (", currentScore.streakWeeks, "w)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.streakBonus, " pts"] })] }), _jsxs("div", { className: "score-row", style: { borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }, children: [_jsx("div", { className: "score-row-label", style: { fontWeight: 600 }, children: "Total" }), _jsxs("span", { className: "score-row-value", style: { fontWeight: 700 }, children: [currentScore.totalPoints, " pts"] })] })] }) }), currentScore.areaScores.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Area Progress" }) }), currentScore.areaScores.map(as => {
                        const area = state.focusAreas.find(a => a.id === as.focusAreaId);
                        if (!area)
                            return null;
                        const pct = Math.round(as.completionRate * 100);
                        return (_jsxs("div", { className: "area-score-card", children: [_jsxs("div", { className: "area-score-header", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color } }), area.name] }), _jsxs("span", { style: { fontSize: 12, color: pct >= 100 ? 'var(--success)' : 'var(--text-secondary)' }, children: [pct, "%"] })] }), _jsx("div", { className: "bar-track", style: { marginTop: 6 }, children: _jsx("div", { className: "bar-fill", style: { width: `${Math.min(100, pct)}%`, background: pct >= 100 ? 'var(--success)' : area.color } }) }), _jsxs("div", { className: "area-score-detail", children: [_jsxs("span", { children: [formatDuration(Math.round(as.actualHours * 60)), " / ", as.targetHours, "h target"] }), budget > 0 && (_jsxs("span", { style: { color: 'var(--text-secondary)', fontSize: 11 }, children: [as.pointsEarned, " pts"] }))] })] }, as.focusAreaId));
                    })] })), currentScore.areaScores.length > 1 && (_jsxs("div", { className: "chart-container mt-16", children: [_jsx("div", { className: "chart-title", children: "Balance" }), _jsxs("div", { className: "balance-meter", children: [_jsx("div", { className: "balance-meter-track", children: _jsx("div", { className: "balance-meter-fill", style: {
                                        width: `${currentScore.balanceRatio * 100}%`,
                                        background: currentScore.balanceRatio >= 0.8 ? 'var(--success)'
                                            : currentScore.balanceRatio >= 0.5 ? 'var(--warning)' : 'var(--error)',
                                    } }) }), _jsxs("div", { className: "balance-meter-labels", children: [_jsx("span", { children: "Imbalanced" }), _jsxs("span", { children: [Math.round(currentScore.balanceRatio * 100), "%"] }), _jsx("span", { children: "Balanced" })] })] }), _jsx("p", { className: "text-secondary text-sm mt-8", children: currentScore.balanceRatio >= 0.8
                            ? 'Great balance across all focus areas.'
                            : currentScore.balanceRatio >= 0.5
                                ? 'Moderate balance — some areas need more attention.'
                                : 'Low balance — over-investing in some areas while neglecting others.' })] })), pastPeriods.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Past Periods" }), budget > 0 && (_jsxs("span", { className: "text-secondary text-sm", children: ["Total: \u20AC", formatEuros(totalAcquiredEuros)] }))] }), pastPeriods.map(period => (_jsxs("div", { className: "time-entry", children: [_jsxs("div", { className: "time-entry-info", children: [_jsxs("div", { className: "time-entry-area", children: [fmtDate(period.start), " \u2013 ", fmtDate(period.end)] }), _jsxs("div", { className: "time-entry-time", children: [Math.round(period.pts), " pts", maxWeekPts > 0 && (_jsxs(_Fragment, { children: [" \u2022 ", Math.round(period.pct * 100), "% of max"] }))] })] }), budget > 0 ? (_jsxs("div", { style: { fontWeight: 700, color: period.pct >= 1 ? 'var(--success)' : 'var(--text)' }, children: ["\u20AC", formatEuros(period.euros)] })) : (_jsxs("div", { className: "time-entry-duration", children: [Math.round(period.pts), " pts"] }))] }, period.idx)))] })), state.weeklyScores.length > 1 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Weekly History" }) }), _jsx("div", { className: "history-chart", children: state.weeklyScores
                            .slice()
                            .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
                            .slice(-8)
                            .map(score => {
                            const isCurrent = new Date(score.weekStart).getTime() === currentWeekStart.getTime();
                            const maxPts = Math.max(1, ...state.weeklyScores.map(s => s.totalPoints));
                            const barPx = maxPts > 0 ? Math.round((score.totalPoints / maxPts) * 72) : 0;
                            const finalPx = score.totalPoints > 0 ? Math.max(barPx, 4) : 0;
                            return (_jsxs("div", { className: "history-bar-wrap", children: [_jsx("div", { className: "history-bar-container", style: { height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }, children: _jsx("div", { className: "history-bar", style: {
                                                height: finalPx,
                                                background: isCurrent ? 'var(--primary)' : 'rgba(108, 99, 255, 0.35)',
                                            } }) }), _jsx("span", { className: "history-label", children: new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' }) }), budget > 0 && maxWeekPts > 0 ? (_jsxs("span", { className: "history-pts", style: { fontSize: 9 }, children: ["\u20AC", formatEuros(pointsToEuros(score.totalPoints, maxWeekPts, budget / 4))] })) : (_jsx("span", { className: "history-pts", children: Math.round(score.totalPoints) }))] }, score.weekStart));
                        }) })] })), state.focusAreas.filter(a => a.weeklyTargetHours > 0).length === 0 && (_jsxs("div", { className: "empty-state mt-16", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }) }), _jsx("p", { children: "Set weekly target hours on your focus areas to start tracking rewards." }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => navigate('/areas'), children: "Set Targets" })] })), showSettings && (_jsxs(Modal, { title: "Reward Settings", onClose: () => setShowSettings(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Monthly reward budget (\u20AC)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.monthlyRewardBudget, onChange: e => setEditSettings({ ...editSettings, monthlyRewardBudget: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsx("div", { className: "text-secondary text-sm mt-8", children: "Prize money available per 4-week period. Reaching 100% of your weekly targets every week earns the full amount. Set to 0 to disable financial tracking." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Points per target hour" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.pointsPerTargetHour, onChange: e => setEditSettings({ ...editSettings, pointsPerTargetHour: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Affects proportional reward calculation. (e.g., 10h target at 100% = ", editSettings.pointsPerTargetHour * 10, " pts)"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Balance bonus (per area)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.balanceBasePoints, onChange: e => setEditSettings({ ...editSettings, balanceBasePoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Streak bonus (per consecutive week)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.streakBonusPoints, onChange: e => setEditSettings({ ...editSettings, streakBonusPoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Gamification enabled", _jsx("button", { className: `toggle-btn ${editSettings.enabled ? 'on' : ''}`, onClick: () => setEditSettings({ ...editSettings, enabled: !editSettings.enabled }), children: _jsx("span", { className: "toggle-knob" }) })] }) }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowSettings(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: saveSettings, children: "Save" })] })] }))] }));
}
