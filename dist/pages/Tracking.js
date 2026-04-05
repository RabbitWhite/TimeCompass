import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { generateId, formatDuration, getCatchUpAreas } from '../utils.js';
export default function Tracking() {
    const { state, dispatch } = useApp();
    const [elapsed, setElapsed] = useState(0);
    const [showManual, setShowManual] = useState(false);
    // Manual entry form
    const [mArea, setMArea] = useState('');
    const [mProject, setMProject] = useState('');
    const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
    const [mStart, setMStart] = useState('09:00');
    const [mEnd, setMEnd] = useState('10:00');
    const [mNote, setMNote] = useState('');
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
    const isStaleSession = elapsed > 8 * 3600;
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
    const formatElapsed = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const catchUpAreas = getCatchUpAreas(state.focusAreas, state.timeEntries, state.settings.gamification, state.focusAreas.length);
    return (_jsxs("div", { children: [state.activeTracking && activeArea ? (_jsxs("div", { className: "tracker-banner", style: { background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }, children: [_jsx("div", { className: "tracking-label", children: "Tracking" }), _jsx("div", { className: "tracking-area", children: activeArea.name }), state.projects.filter(p => p.focusAreaId === activeArea.id).length > 0 && (_jsxs("select", { className: "tracking-project-select", value: state.activeTracking.projectId, onChange: e => dispatch({
                            type: 'START_TRACKING',
                            payload: { ...state.activeTracking, projectId: e.target.value },
                        }), children: [_jsx("option", { value: "", children: "No realization" }), state.projects
                                .filter(p => p.focusAreaId === activeArea.id)
                                .map(p => _jsx("option", { value: p.id, children: p.name }, p.id))] })), _jsx("div", { className: "tracking-time", children: formatElapsed(elapsed) }), isStaleSession && (_jsx("div", { className: "tracking-stale-warning", children: "Session running for a long time \u2014 did you forget to stop?" })), _jsxs("button", { className: "btn", onClick: stopTracking, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M6 6h12v12H6z" }) }), "Stop"] })] })) : (_jsxs("div", { className: "tracker-banner", children: [_jsx("div", { className: "tracking-label", children: "Ready to track" }), _jsx("div", { className: "tracking-area", style: { fontSize: 16, opacity: 0.8 }, children: "Select a focus area below to start" })] })), _jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Quick Start" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowManual(true), children: "+ Manual" })] }), _jsx("div", { className: "quick-buttons", children: state.focusAreas.map(area => (_jsxs("button", { className: "quick-btn", onClick: () => startTracking(area.id), style: state.activeTracking?.focusAreaId === area.id ? { borderColor: area.color, background: `${area.color}15` } : {}, children: [_jsx("span", { className: "area-dot", style: { background: area.color } }), _jsx("span", { className: "truncate", children: area.name })] }, area.id))) }), state.focusAreas.length === 0 && (_jsx("div", { className: "text-secondary text-sm", style: { textAlign: 'center', padding: 16 }, children: "Add focus areas first to start tracking." })), state.focusAreas.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "section-header mt-16", children: _jsx("span", { className: "section-title", children: "Focus Areas" }) }), catchUpAreas.map(({ area, gapMinutes, totalMinutes, urgency }) => (_jsx("div", { className: "allocation-bar", children: _jsxs("div", { className: "allocation-header", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color } }), area.name] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { className: "allocation-hours", children: [formatDuration(totalMinutes), " done"] }), gapMinutes > 0 && (_jsxs("span", { className: "allocation-hours", children: [formatDuration(gapMinutes), " behind"] })), _jsx("span", { style: {
                                                color: urgency === 0 ? 'var(--success)' : urgency === 1 ? 'var(--text-muted)' : urgency === 2 ? 'var(--warning)' : 'var(--error)',
                                                fontWeight: 600,
                                            }, children: urgency === 0 ? '✓' : urgency === 1 ? '!' : urgency === 2 ? '!!' : '!!!' })] })] }) }, area.id)))] })), showManual && (_jsxs(Modal, { title: "Manual Time Entry", onClose: () => setShowManual(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Focus Area" }), _jsxs("select", { className: "form-select", value: mArea, onChange: e => { setMArea(e.target.value); setMProject(''); }, children: [_jsx("option", { value: "", children: "Select area..." }), state.focusAreas.map(a => _jsx("option", { value: a.id, children: a.name }, a.id))] })] }), mArea && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Realization (optional)" }), _jsxs("select", { className: "form-select", value: mProject, onChange: e => setMProject(e.target.value), children: [_jsx("option", { value: "", children: "None" }), state.projects.filter(p => p.focusAreaId === mArea).map(p => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Date" }), _jsx("input", { className: "form-input", type: "date", value: mDate, onChange: e => setMDate(e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Start Time" }), _jsx("input", { className: "form-input", type: "time", value: mStart, onChange: e => setMStart(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "End Time" }), _jsx("input", { className: "form-input", type: "time", value: mEnd, onChange: e => setMEnd(e.target.value) })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Note" }), _jsx("input", { className: "form-input", value: mNote, onChange: e => setMNote(e.target.value), placeholder: "What did you work on?" })] }), _jsx("div", { className: "modal-actions", children: _jsx("button", { className: "btn btn-primary", onClick: saveManual, children: "Save Entry" }) })] }))] }));
}
