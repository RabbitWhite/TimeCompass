import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store.js';
import { formatDuration, getWeekStart, getWeekEnd, getDaysBetween, isSameDay, formatDate, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros, getCatchUpAreas } from '../utils.js';
const PERIODS = [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30', label: 'Last 30 Days' },
];
export default function Statistics() {
    const { state } = useApp();
    const [period, setPeriod] = useState('this_week');
    const [filterArea, setFilterArea] = useState('');
    const gamSettings = state.settings.gamification;
    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        switch (period) {
            case 'this_week':
                return { startDate: getWeekStart(now), endDate: getWeekEnd(now) };
            case 'last_week': {
                const prev = new Date(now);
                prev.setDate(prev.getDate() - 7);
                return { startDate: getWeekStart(prev), endDate: getWeekEnd(prev) };
            }
            case 'this_month': {
                const s = new Date(now.getFullYear(), now.getMonth(), 1);
                const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                return { startDate: s, endDate: e };
            }
            case 'last_30': {
                const s = new Date(now);
                s.setDate(s.getDate() - 30);
                s.setHours(0, 0, 0, 0);
                return { startDate: s, endDate: now };
            }
        }
    }, [period]);
    const entries = useMemo(() => {
        return state.timeEntries.filter(e => {
            const d = new Date(e.startTime);
            if (d < startDate || d > endDate)
                return false;
            if (filterArea && e.focusAreaId !== filterArea)
                return false;
            return true;
        });
    }, [state.timeEntries, startDate, endDate, filterArea]);
    // Per-area breakdown — sorted by lowest current-period completion first
    const areaBreakdown = useMemo(() => {
        const catchUpOrder = getCatchUpAreas(state.focusAreas, state.timeEntries, gamSettings, state.focusAreas.length, state.settings.periodResetDate);
        const rankMap = new Map(catchUpOrder.map(({ area }, i) => [area.id, i]));
        const map = new Map();
        entries.forEach(e => {
            map.set(e.focusAreaId, (map.get(e.focusAreaId) || 0) + e.duration);
        });
        return state.focusAreas
            .map(area => ({ area, minutes: map.get(area.id) || 0 }))
            .filter(a => a.minutes > 0 || !filterArea)
            .sort((a, b) => (rankMap.get(a.area.id) ?? 999) - (rankMap.get(b.area.id) ?? 999));
    }, [entries, state.focusAreas, state.timeEntries, gamSettings, filterArea]);
    // Daily breakdown for bar chart
    const dailyData = useMemo(() => {
        const days = getDaysBetween(startDate, endDate);
        return days.map(day => {
            const dayEntries = entries.filter(e => isSameDay(new Date(e.startTime), day));
            const total = dayEntries.reduce((s, e) => s + e.duration, 0);
            return { date: day, total };
        });
    }, [entries, startDate, endDate]);
    const maxDaily = Math.max(1, ...dailyData.map(d => d.total));
    const exportCSV = useCallback(() => {
        const csvEscape = (val) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };
        const header = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Duration (hours)', 'Focus Area', 'Realization', 'Note'];
        const rows = entries
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((e) => {
            const area = state.focusAreas.find(a => a.id === e.focusAreaId);
            const project = e.projectId ? state.projects.find(p => p.id === e.projectId) : null;
            const start = new Date(e.startTime);
            const end = new Date(e.endTime);
            return [
                start.toISOString().split('T')[0],
                start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                String(e.duration),
                (e.duration / 60).toFixed(2),
                area?.name || 'Unknown',
                project?.name || '',
                e.note || '',
            ].map(csvEscape).join(',');
        });
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timecompass-${period}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [entries, state.focusAreas, state.projects, period]);
    // Pie chart data
    const pieData = areaBreakdown.filter(a => a.minutes > 0);
    const pieTotal = Math.max(1, pieData.reduce((s, a) => s + a.minutes, 0));
    // Gamification historical data (moved from Gamification.tsx)
    const currentWeekStart = useMemo(() => getWeekStart(), []);
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
    const currentScore = useMemo(() => calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak), [state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak]);
    const currentPeriodIdx = getPeriodIndex(currentWeekStart);
    const maxWeekPts = useMemo(() => computeMaxWeekPoints(state.focusAreas, gamSettings), [state.focusAreas, gamSettings]);
    const currentPeriodPoints = useMemo(() => {
        const past = state.weeklyScores
            .filter(s => {
            const wStart = new Date(s.weekStart);
            return getPeriodIndex(wStart) === currentPeriodIdx
                && wStart.getTime() !== currentWeekStart.getTime();
        })
            .reduce((s, sc) => s + sc.totalPoints, 0);
        return past + currentScore.totalPoints;
    }, [state.weeklyScores, currentScore, currentPeriodIdx]);
    const budget = gamSettings.monthlyRewardBudget;
    const fmtDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const pastPeriods = useMemo(() => {
        const byPeriod = new Map();
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
            const euros = pointsToEuros(pts, maxWeekPts, budget);
            const pct = maxWeekPts > 0 ? Math.min(1, pts / (maxWeekPts * 4)) : 0;
            return { idx, pts, euros, pct, start, end };
        });
    }, [state.weeklyScores, currentPeriodIdx, maxWeekPts, budget]);
    const totalAcquiredEuros = pastPeriods.reduce((s, p) => s + p.euros, 0);
    return (_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Statistics" }), entries.length > 0 && (_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: exportCSV, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }), "Export CSV"] }))] }), _jsx("div", { className: "timeline-controls", children: PERIODS.map(p => (_jsx("button", { className: `timeline-chip ${period === p.value ? 'active' : ''}`, onClick: () => setPeriod(p.value), children: p.label }, p.value))) }), state.focusAreas.length > 1 && (_jsx("div", { className: "form-group", children: _jsxs("select", { className: "form-select", value: filterArea, onChange: e => setFilterArea(e.target.value), style: { fontSize: 13, padding: 8 }, children: [_jsx("option", { value: "", children: "All Focus Areas" }), state.focusAreas.map(a => (_jsx("option", { value: a.id, children: a.name }, a.id)))] }) })), pieData.length > 0 && (_jsxs("div", { className: "chart-container", children: [_jsx("div", { className: "chart-title", children: "Time Distribution" }), _jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' }, children: _jsx("svg", { width: "160", height: "160", viewBox: "-1 -1 2 2", style: { transform: 'rotate(-90deg)' }, children: (() => {
                                let cumulative = 0;
                                return pieData.map(({ area, minutes }) => {
                                    const pct = minutes / pieTotal;
                                    const startAngle = cumulative * 2 * Math.PI;
                                    cumulative += pct;
                                    const endAngle = cumulative * 2 * Math.PI;
                                    const largeArc = pct > 0.5 ? 1 : 0;
                                    const x1 = Math.cos(startAngle);
                                    const y1 = Math.sin(startAngle);
                                    const x2 = Math.cos(endAngle);
                                    const y2 = Math.sin(endAngle);
                                    if (pieData.length === 1) {
                                        return _jsx("circle", { r: "1", fill: area.color }, area.id);
                                    }
                                    return (_jsx("path", { d: `M ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} L 0 0`, fill: area.color }, area.id));
                                });
                            })() }) }), _jsx("div", { className: "chart-legend", children: pieData.map(({ area, minutes }) => (_jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "legend-dot", style: { background: area.color } }), area.name, " (", Math.round((minutes / pieTotal) * 100), "%)"] }, area.id))) })] })), (period === 'this_week' || period === 'last_week') && areaBreakdown.length > 0 && (_jsxs("div", { className: "chart-container", children: [_jsx("div", { className: "chart-title", children: "Actual vs Target" }), areaBreakdown.map(({ area, minutes }) => {
                        const targetMins = area.weeklyTargetHours * 60;
                        const maxMins = Math.max(targetMins, minutes, 1);
                        return (_jsxs("div", { className: "comparison-row", children: [_jsxs("div", { className: "comparison-label", children: [_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { className: "legend-dot", style: { background: area.color } }), area.name] }), _jsxs("span", { className: "text-secondary", children: [formatDuration(minutes), " / ", area.weeklyTargetHours, "h"] })] }), _jsxs("div", { className: "comparison-bars", children: [_jsx("div", { className: "comparison-bar", style: {
                                                width: `${(minutes / maxMins) * 100}%`,
                                                background: area.color,
                                                minWidth: minutes > 0 ? 4 : 0,
                                            } }), _jsx("div", { className: "comparison-bar", style: {
                                                width: `${(targetMins / maxMins) * 100}%`,
                                                background: `${area.color}40`,
                                                minWidth: targetMins > 0 ? 4 : 0,
                                            } })] })] }, area.id));
                    }), _jsxs("div", { className: "chart-legend mt-8", children: [_jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "legend-dot", style: { background: 'var(--primary)' } }), " Actual"] }), _jsxs("div", { className: "legend-item", children: [_jsx("span", { className: "legend-dot", style: { background: 'var(--primary)', opacity: 0.25 } }), " Target"] })] })] })), dailyData.length > 0 && dailyData.some(d => d.total > 0) && (_jsxs("div", { className: "chart-container", children: [_jsx("div", { className: "chart-title", children: "Daily Activity" }), _jsx("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, padding: '8px 0' }, children: dailyData.map(({ date, total }) => {
                            const maxBarPx = 90;
                            const barPx = maxDaily > 0 ? Math.round((total / maxDaily) * maxBarPx) : 0;
                            const finalPx = total > 0 ? Math.max(barPx, 4) : 0;
                            const isToday = isSameDay(date, new Date());
                            return (_jsxs("div", { style: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    gap: 4,
                                    height: maxBarPx + 20,
                                }, children: [_jsx("div", { style: {
                                            width: '100%',
                                            maxWidth: 32,
                                            height: finalPx,
                                            background: isToday ? 'var(--primary)' : 'rgba(108, 99, 255, 0.35)',
                                            borderRadius: 3,
                                            transition: 'height 0.3s',
                                        }, title: `${formatDate(date.toISOString())}: ${formatDuration(total)}` }), _jsx("span", { style: { fontSize: 9, color: isToday ? 'var(--primary)' : 'var(--text-muted)' }, children: date.toLocaleDateString('en', { weekday: 'narrow' }) })] }, date.toISOString()));
                        }) })] })), gamSettings.enabled && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "This Week" }), budget > 0 && maxWeekPts > 0 && (_jsxs("span", { className: "text-secondary text-sm", children: ["~\u20AC", formatEuros(pointsToEuros(currentScore.totalPoints, maxWeekPts, budget / 4)), " so far"] }))] }), _jsx("div", { className: "score-card", children: _jsxs("div", { className: "score-breakdown", children: [_jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--success)", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }), "Achievement"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.achievementPoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--primary)", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" }) }), "Balance (", Math.round(currentScore.balanceRatio * 100), "%)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.balancePoints, " pts"] })] }), _jsxs("div", { className: "score-row", children: [_jsxs("div", { className: "score-row-label", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "var(--warning)", children: _jsx("path", { d: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51L12.96 17.55 11 21z" }) }), "Streak (", currentScore.streakWeeks, "w)"] }), _jsxs("span", { className: "score-row-value", children: [currentScore.streakBonus, " pts"] })] }), _jsxs("div", { className: "score-row", style: { borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }, children: [_jsx("div", { className: "score-row-label", style: { fontWeight: 600 }, children: "Total" }), _jsxs("span", { className: "score-row-value", style: { fontWeight: 700 }, children: [currentScore.totalPoints, " pts"] })] })] }) }), pastPeriods.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Past Periods" }), budget > 0 && (_jsxs("span", { className: "text-secondary text-sm", children: ["Total: \u20AC", formatEuros(totalAcquiredEuros)] }))] }), pastPeriods.map(p => (_jsxs("div", { className: "time-entry", children: [_jsxs("div", { className: "time-entry-info", children: [_jsxs("div", { className: "time-entry-area", children: [fmtDate(p.start), " \u2013 ", fmtDate(p.end)] }), _jsxs("div", { className: "time-entry-time", children: [Math.round(p.pts), " pts", maxWeekPts > 0 && _jsxs(_Fragment, { children: [" \u2022 ", Math.round(p.pct * 100), "% of max"] })] })] }), budget > 0 ? (_jsxs("div", { style: { fontWeight: 700, color: p.pct >= 1 ? 'var(--success)' : 'var(--text)' }, children: ["\u20AC", formatEuros(p.euros)] })) : (_jsxs("div", { className: "time-entry-duration", children: [Math.round(p.pts), " pts"] }))] }, p.idx)))] })), state.weeklyScores.length > 1 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Weekly History" }) }), _jsx("div", { className: "history-chart", children: state.weeklyScores
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
                                                    } }) }), _jsx("span", { className: "history-label", children: new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' }) }), budget > 0 && maxWeekPts > 0 ? (_jsxs("span", { className: "history-pts", style: { fontSize: 11 }, children: ["\u20AC", formatEuros(pointsToEuros(score.totalPoints, maxWeekPts, budget / 4))] })) : (_jsx("span", { className: "history-pts", children: Math.round(score.totalPoints) }))] }, score.weekStart));
                                }) })] }))] })), entries.length === 0 && (_jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" }) }), _jsxs("p", { children: ["No data for this period yet.", _jsx("br", {}), "Start tracking time to see statistics."] })] }))] }));
}
