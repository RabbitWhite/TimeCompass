import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store.js';
import { formatDuration, getWeekStart, getWeekEnd, getDaysBetween, isSameDay, formatDate } from '../utils.js';
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
    const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
    const entryCount = entries.length;
    const avgPerDay = (() => {
        const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
        return totalMinutes / days;
    })();
    // Per-area breakdown
    const areaBreakdown = useMemo(() => {
        const map = new Map();
        entries.forEach(e => {
            map.set(e.focusAreaId, (map.get(e.focusAreaId) || 0) + e.duration);
        });
        return state.focusAreas
            .map(area => ({ area, minutes: map.get(area.id) || 0 }))
            .filter(a => a.minutes > 0 || !filterArea)
            .sort((a, b) => b.minutes - a.minutes);
    }, [entries, state.focusAreas, filterArea]);
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
        link.download = `lifetracker-${period}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [entries, state.focusAreas, state.projects, period]);
    // Pie chart data
    const pieData = areaBreakdown.filter(a => a.minutes > 0);
    const pieTotal = Math.max(1, pieData.reduce((s, a) => s + a.minutes, 0));
    return (_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Statistics" }), entries.length > 0 && (_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: exportCSV, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) }), "Export CSV"] }))] }), _jsx("div", { className: "timeline-controls", children: PERIODS.map(p => (_jsx("button", { className: `timeline-chip ${period === p.value ? 'active' : ''}`, onClick: () => setPeriod(p.value), children: p.label }, p.value))) }), state.focusAreas.length > 1 && (_jsx("div", { className: "form-group", children: _jsxs("select", { className: "form-select", value: filterArea, onChange: e => setFilterArea(e.target.value), style: { fontSize: 13, padding: 8 }, children: [_jsx("option", { value: "", children: "All Focus Areas" }), state.focusAreas.map(a => (_jsx("option", { value: a.id, children: a.name }, a.id)))] }) })), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: formatDuration(totalMinutes) }), _jsx("div", { className: "stat-label", children: "Total Time" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: entryCount }), _jsx("div", { className: "stat-label", children: "Sessions" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: formatDuration(Math.round(avgPerDay)) }), _jsx("div", { className: "stat-label", children: "Avg/Day" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: entryCount > 0 ? formatDuration(Math.round(totalMinutes / entryCount)) : '0m' }), _jsx("div", { className: "stat-label", children: "Avg Session" })] })] }), pieData.length > 0 && (_jsxs("div", { className: "chart-container", children: [_jsx("div", { className: "chart-title", children: "Time Distribution" }), _jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' }, children: _jsx("svg", { width: "160", height: "160", viewBox: "-1 -1 2 2", style: { transform: 'rotate(-90deg)' }, children: (() => {
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
                        }) })] })), entries.length === 0 && (_jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" }) }), _jsxs("p", { children: ["No data for this period yet.", _jsx("br", {}), "Start tracking time to see statistics."] })] }))] }));
}
