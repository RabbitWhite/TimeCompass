import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { generateId, formatDuration, isThisWeek, formatTime } from '../utils.js';
export default function Tracking() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [showAllocation, setShowAllocation] = useState(false);
    // Manual entry form
    const [mArea, setMArea] = useState('');
    const [mProject, setMProject] = useState('');
    const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
    const [mStart, setMStart] = useState('09:00');
    const [mEnd, setMEnd] = useState('10:00');
    const [mNote, setMNote] = useState('');
    // Allocation editor
    const [allocations, setAllocations] = useState({});
    useEffect(() => {
        if (!state.activeTracking) {
            setElapsed(0);
            return;
        }
        const tick = () => {
            const start = new Date(state.activeTracking.startTime).getTime();
            setElapsed(Math.floor((Date.now() - start) / 1000));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state.activeTracking]);
    const activeArea = state.activeTracking
        ? state.focusAreas.find(a => a.id === state.activeTracking.focusAreaId)
        : null;
    const isStaleSession = elapsed > 8 * 3600; // tracking open for more than 8 hours
    const startTracking = (areaId) => {
        if (state.activeTracking)
            stopTracking();
        dispatch({
            type: 'START_TRACKING',
            payload: { focusAreaId: areaId, projectId: '', startTime: new Date().toISOString() },
        });
    };
    const stopTracking = () => {
        if (!state.activeTracking)
            return;
        const start = state.activeTracking.startTime;
        const end = new Date().toISOString();
        const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
        if (duration > 0) {
            const entry = {
                id: generateId(),
                focusAreaId: state.activeTracking.focusAreaId,
                projectId: state.activeTracking.projectId,
                startTime: start,
                endTime: end,
                duration,
                note: '',
            };
            dispatch({ type: 'ADD_TIME_ENTRY', payload: entry });
        }
        dispatch({ type: 'STOP_TRACKING' });
    };
    const saveManual = () => {
        if (!mArea || !mDate || !mStart || !mEnd)
            return;
        const startTime = new Date(`${mDate}T${mStart}`).toISOString();
        const endTime = new Date(`${mDate}T${mEnd}`).toISOString();
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
        if (duration <= 0)
            return;
        const entry = {
            id: generateId(),
            focusAreaId: mArea,
            projectId: mProject,
            startTime,
            endTime,
            duration,
            note: mNote.trim(),
        };
        dispatch({ type: 'ADD_TIME_ENTRY', payload: entry });
        setShowManual(false);
    };
    const openAllocation = () => {
        const alloc = {};
        state.focusAreas.forEach(a => { alloc[a.id] = a.weeklyTargetHours; });
        setAllocations(alloc);
        setShowAllocation(true);
    };
    const saveAllocations = () => {
        Object.entries(allocations).forEach(([id, hours]) => {
            const area = state.focusAreas.find(a => a.id === id);
            if (area && area.weeklyTargetHours !== hours) {
                dispatch({ type: 'UPDATE_FOCUS_AREA', payload: { ...area, weeklyTargetHours: hours } });
            }
        });
        setShowAllocation(false);
    };
    const weekEntries = state.timeEntries
        .filter(e => isThisWeek(e.startTime))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    const todayEntries = weekEntries.filter(e => {
        return new Date(e.startTime).toDateString() === new Date().toDateString();
    });
    const formatElapsed = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const totalTarget = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours, 0);
    return (_jsxs("div", { children: [state.activeTracking && activeArea ? (_jsxs("div", { className: "tracker-banner", style: { background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }, children: [_jsx("div", { className: "tracking-label", children: "Tracking" }), _jsx("div", { className: "tracking-area", children: activeArea.name }), state.projects.filter(p => p.focusAreaId === activeArea.id).length > 0 && (_jsxs("select", { className: "tracking-project-select", value: state.activeTracking.projectId, onChange: e => dispatch({
                            type: 'START_TRACKING',
                            payload: { ...state.activeTracking, projectId: e.target.value },
                        }), children: [_jsx("option", { value: "", children: "No realization" }), state.projects
                                .filter(p => p.focusAreaId === activeArea.id)
                                .map(p => _jsx("option", { value: p.id, children: p.name }, p.id))] })), _jsx("div", { className: "tracking-time", children: formatElapsed(elapsed) }), isStaleSession && (_jsx("div", { className: "tracking-stale-warning", children: "Session running for a long time \u2014 did you forget to stop?" })), _jsxs("button", { className: "btn", onClick: stopTracking, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M6 6h12v12H6z" }) }), "Stop"] })] })) : (_jsxs("div", { className: "tracker-banner", children: [_jsx("div", { className: "tracking-label", children: "Ready to track" }), _jsx("div", { className: "tracking-area", style: { fontSize: 16, opacity: 0.8 }, children: "Select a focus area below to start" })] })), _jsx("div", { className: "section-header", children: _jsx("span", { className: "section-title", children: "Quick Start" }) }), _jsx("div", { className: "quick-buttons", children: state.focusAreas.map(area => (_jsxs("button", { className: "quick-btn", onClick: () => startTracking(area.id), style: state.activeTracking?.focusAreaId === area.id ? { borderColor: area.color, background: `${area.color}15` } : {}, children: [_jsx("span", { className: "area-dot", style: { background: area.color } }), _jsx("span", { className: "truncate", children: area.name })] }, area.id))) }), state.focusAreas.length === 0 && (_jsx("div", { className: "text-secondary text-sm", style: { textAlign: 'center', padding: 16 }, children: "Add focus areas first to start tracking." })), _jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Weekly Allocation" }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsxs("button", { className: "btn btn-ghost btn-sm", onClick: () => navigate('/templates'), title: "Week Templates", style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "15", height: "15", fill: "currentColor", children: _jsx("path", { d: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-5 8v-2h8v2H8zm0-4v-2h8v2H8zm0-4V7h3v2H8z" }) }), "Templates"] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: openAllocation, children: "Edit" })] })] }), state.focusAreas.map(area => {
                const weekMins = weekEntries
                    .filter(e => e.focusAreaId === area.id)
                    .reduce((s, e) => s + e.duration, 0);
                const targetMins = area.weeklyTargetHours * 60;
                const pct = targetMins > 0 ? Math.min(100, (weekMins / targetMins) * 100) : 0;
                return (_jsxs("div", { className: "allocation-bar", children: [_jsxs("div", { className: "allocation-header", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color } }), area.name] }), _jsxs("span", { className: "allocation-hours", children: [formatDuration(weekMins), " / ", area.weeklyTargetHours, "h"] })] }), _jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill", style: { width: `${pct}%`, background: area.color } }) })] }, area.id));
            }), totalTarget > 0 && (_jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Total target: ", totalTarget, "h/week"] })), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Today's Log" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowManual(true), children: "+ Manual" })] }), todayEntries.map(entry => {
                const area = state.focusAreas.find(a => a.id === entry.focusAreaId);
                const project = entry.projectId ? state.projects.find(p => p.id === entry.projectId) : null;
                return (_jsxs("div", { className: "time-entry", children: [_jsxs("div", { className: "time-entry-info", children: [_jsxs("div", { className: "time-entry-area", style: { color: area?.color }, children: [area?.name || 'Unknown', project && _jsxs("span", { className: "time-entry-project", children: [" / ", project.name] })] }), _jsxs("div", { className: "time-entry-time", children: [formatTime(entry.startTime), " - ", formatTime(entry.endTime), entry.note && ` \u2022 ${entry.note}`] })] }), _jsx("div", { className: "time-entry-duration", children: formatDuration(entry.duration) }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => dispatch({ type: 'DELETE_TIME_ENTRY', payload: entry.id }), children: "\u00D7" })] }, entry.id));
            }), todayEntries.length === 0 && (_jsx("div", { className: "text-secondary text-sm", style: { textAlign: 'center', padding: 16 }, children: "No time entries today." })), showManual && (_jsxs(Modal, { title: "Manual Time Entry", onClose: () => setShowManual(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Focus Area" }), _jsxs("select", { className: "form-select", value: mArea, onChange: e => { setMArea(e.target.value); setMProject(''); }, children: [_jsx("option", { value: "", children: "Select area..." }), state.focusAreas.map(a => _jsx("option", { value: a.id, children: a.name }, a.id))] })] }), mArea && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Realization (optional)" }), _jsxs("select", { className: "form-select", value: mProject, onChange: e => setMProject(e.target.value), children: [_jsx("option", { value: "", children: "None" }), state.projects.filter(p => p.focusAreaId === mArea).map(p => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Date" }), _jsx("input", { className: "form-input", type: "date", value: mDate, onChange: e => setMDate(e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Start Time" }), _jsx("input", { className: "form-input", type: "time", value: mStart, onChange: e => setMStart(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "End Time" }), _jsx("input", { className: "form-input", type: "time", value: mEnd, onChange: e => setMEnd(e.target.value) })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Note" }), _jsx("input", { className: "form-input", value: mNote, onChange: e => setMNote(e.target.value), placeholder: "What did you work on?" })] }), _jsx("div", { className: "modal-actions", children: _jsx("button", { className: "btn btn-primary", onClick: saveManual, children: "Save Entry" }) })] })), showAllocation && (_jsxs(Modal, { title: "Weekly Time Allocation", onClose: () => setShowAllocation(false), children: [_jsx("p", { className: "text-secondary text-sm mb-16", children: "Set how many hours per week you want to dedicate to each focus area." }), state.focusAreas.map(area => (_jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { className: "dot", style: { background: area.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' } }), area.name] }), _jsxs("div", { className: "time-input-row", children: [_jsx("input", { className: "form-input", type: "number", value: allocations[area.id] || 0, onChange: e => setAllocations({ ...allocations, [area.id]: parseFloat(e.target.value) || 0 }), min: "0", step: "0.5" }), _jsx("span", { className: "text-secondary", children: "hours/week" })] })] }, area.id))), _jsxs("div", { className: "text-secondary text-sm mt-8", children: ["Total: ", Object.values(allocations).reduce((s, v) => s + v, 0), "h/week"] }), _jsx("div", { className: "modal-actions", children: _jsx("button", { className: "btn btn-primary", onClick: saveAllocations, children: "Save" }) })] }))] }));
}
