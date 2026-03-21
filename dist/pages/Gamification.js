import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { calculateWeeklyScore, getWeekStart, getWeekLabel, getLevelFromPoints, formatDuration, } from '../utils.js';
export default function Gamification() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    const gamSettings = state.settings.gamification;
    const [editSettings, setEditSettings] = useState({ ...gamSettings });
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
            }
            else {
                break;
            }
        }
        return streak;
    }, [state.weeklyScores]);
    const currentScore = useMemo(() => {
        return calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak);
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
        return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/'), children: "\u2190 Dashboard" }), _jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }) }), _jsx("p", { children: "Gamification is disabled." }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => dispatch({ type: 'UPDATE_GAMIFICATION_SETTINGS', payload: { enabled: true } }), children: "Enable Points" })] })] }));
    }
    return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/'), children: "\u2190 Dashboard" }), _jsxs("div", { className: "gamification-hero", children: [_jsxs("div", { className: "level-badge", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "32", height: "32", fill: "var(--warning)", children: _jsx("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }) }), _jsxs("span", { className: "level-number", children: ["Lv.", level.level] })] }), _jsx("div", { className: "level-title", children: level.title }), _jsxs("div", { className: "total-points", children: [Math.round(allTimePoints), " pts"] }), _jsx("div", { className: "level-progress-track", children: _jsx("div", { className: "level-progress-fill", style: { width: `${level.progress * 100}%` } }) }), _jsxs("div", { className: "level-progress-label", children: [Math.round(allTimePoints), " / ", level.nextThreshold, " pts to next level"] })] }), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "This Week" }), _jsxs("button", { className: "btn btn-ghost btn-sm", onClick: () => { setEditSettings({ ...gamSettings }); setShowSettings(true); }, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" }) }), "Settings"] })] }), _jsxs("div", { className: "score-card", children: [_jsxs("div", { className: "score-total", children: [_jsx("span", { className: "score-number", children: currentScore.totalPoints }), _jsx("span", { className: "score-unit", children: "pts this week" })] }), _jsxs("div", { className: "score-breakdown", children: [_jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--success)", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }), "Achievement"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.achievementPoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--primary)", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" }) }), "Balance (", Math.round(currentScore.balanceRatio * 100), "%)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.balancePoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--warning)", children: _jsx("path", { d: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51L12.96 17.55 11 21z" }) }), "Streak (", currentScore.streakWeeks, "w)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.streakBonus, " pts"] })] })] })] }), currentScore.areaScores.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Area Scores" }) }), currentScore.areaScores.map(as => {
                        const area = state.focusAreas.find(a => a.id === as.focusAreaId);
                        if (!area)
                            return null;
                        const pct = Math.round(as.completionRate * 100);
                        return (_jsxs("div", { className: "area-score-card", children: [_jsxs("div", { className: "area-score-header", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color } }), area.name] }), _jsxs("span", { className: "score-pts", children: ["+", as.pointsEarned, " pts"] })] }), _jsx("div", { className: "bar-track", style: { marginTop: 6 }, children: _jsx("div", { className: "bar-fill", style: {
                                            width: `${Math.min(100, pct)}%`,
                                            background: pct >= 100 ? 'var(--success)' : area.color,
                                        } }) }), _jsxs("div", { className: "area-score-detail", children: [_jsxs("span", { children: [formatDuration(Math.round(as.actualHours * 60)), " / ", as.targetHours, "h target"] }), _jsxs("span", { style: { color: pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--text-muted)' }, children: [pct, "%"] })] })] }, as.focusAreaId));
                    })] })), currentScore.areaScores.length > 1 && (_jsxs("div", { className: "chart-container mt-16", children: [_jsx("div", { className: "chart-title", children: "Balance Meter" }), _jsxs("div", { className: "balance-meter", children: [_jsx("div", { className: "balance-meter-track", children: _jsx("div", { className: "balance-meter-fill", style: {
                                        width: `${currentScore.balanceRatio * 100}%`,
                                        background: currentScore.balanceRatio >= 0.8
                                            ? 'var(--success)'
                                            : currentScore.balanceRatio >= 0.5
                                                ? 'var(--warning)'
                                                : 'var(--error)',
                                    } }) }), _jsxs("div", { className: "balance-meter-labels", children: [_jsx("span", { children: "Imbalanced" }), _jsxs("span", { children: [Math.round(currentScore.balanceRatio * 100), "%"] }), _jsx("span", { children: "Balanced" })] })] }), _jsx("p", { className: "text-secondary text-sm mt-8", children: currentScore.balanceRatio >= 0.8
                            ? 'Great balance! You are addressing all your focus areas evenly.'
                            : currentScore.balanceRatio >= 0.5
                                ? 'Moderate balance. Some areas need more attention.'
                                : 'Low balance. Over-investing in some areas while neglecting others reduces your score.' })] })), pastScores.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "History" }) }), _jsx("div", { className: "history-chart", children: state.weeklyScores
                            .slice()
                            .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
                            .slice(-8)
                            .map(score => {
                            const isCurrent = new Date(score.weekStart).getTime() === currentWeekStart.getTime();
                            const h = maxHistoryPoints > 0 ? (score.totalPoints / maxHistoryPoints) * 100 : 0;
                            return (_jsxs("div", { className: "history-bar-wrap", children: [_jsx("div", { className: "history-bar-container", children: _jsx("div", { className: "history-bar", style: {
                                                height: `${Math.max(h, score.totalPoints > 0 ? 4 : 0)}%`,
                                                background: isCurrent ? 'var(--primary)' : 'var(--surface-elevated)',
                                            } }) }), _jsx("span", { className: "history-label", children: new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' }) }), _jsx("span", { className: "history-pts", children: Math.round(score.totalPoints) })] }, score.weekStart));
                        }) }), pastScores.map(score => (_jsxs("div", { className: "time-entry", children: [_jsxs("div", { className: "time-entry-info", children: [_jsx("div", { className: "time-entry-area", children: getWeekLabel(score.weekStart) }), _jsxs("div", { className: "time-entry-time", children: ["Achievement: ", score.achievementPoints, " | Balance: ", score.balancePoints, " | Streak: ", score.streakBonus] })] }), _jsxs("div", { className: "time-entry-duration", children: [Math.round(score.totalPoints), " pts"] })] }, score.weekStart)))] })), state.focusAreas.filter(a => a.weeklyTargetHours > 0).length === 0 && (_jsxs("div", { className: "empty-state mt-16", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" }) }), _jsx("p", { children: "Set weekly target hours on your focus areas to start earning points." }), _jsx("button", { className: "btn btn-primary mt-16", onClick: () => navigate('/areas'), children: "Set Targets" })] })), showSettings && (_jsxs(Modal, { title: "Points Settings", onClose: () => setShowSettings(false), children: [_jsx("p", { className: "text-secondary text-sm mb-16", children: "Adjust how points are calculated. Changes apply to all future score calculations." }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Points per target hour" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.pointsPerTargetHour, onChange: e => setEditSettings({ ...editSettings, pointsPerTargetHour: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Points earned per hour of weekly target when fully achieved. (e.g., 10h target at 100% = ", editSettings.pointsPerTargetHour * 10, " pts)"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Balance bonus (per area)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.balanceBasePoints, onChange: e => setEditSettings({ ...editSettings, balanceBasePoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsx("div", { className: "text-secondary text-sm mt-8", children: "Bonus points per area for keeping all areas balanced. Scales with completion uniformity." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Streak bonus (per week)" }), _jsx("input", { className: "form-input", type: "number", value: editSettings.streakBonusPoints, onChange: e => setEditSettings({ ...editSettings, streakBonusPoints: parseFloat(e.target.value) || 0 }), min: "0", step: "1" }), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Bonus for consecutive weeks hitting all targets. Multiplied by streak count (week 3 = ", editSettings.streakBonusPoints * 3, " pts)."] })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { className: "form-label", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: ["Gamification", _jsx("button", { className: `toggle-btn ${editSettings.enabled ? 'on' : ''}`, onClick: () => setEditSettings({ ...editSettings, enabled: !editSettings.enabled }), children: _jsx("span", { className: "toggle-knob" }) })] }) }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowSettings(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: saveSettings, children: "Save" })] })] }))] }));
}
