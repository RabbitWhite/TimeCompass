import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { generateId } from '../utils.js';
const MAX_WEEKLY_HOURS = 24 * 7; // 168
function buildInitialTargets(focusAreas, projects, base) {
    return focusAreas.map(area => {
        const existing = base?.focusAreaTargets.find(t => t.focusAreaId === area.id);
        const areaProjects = projects.filter(p => p.focusAreaId === area.id);
        const projectTargets = areaProjects.map(p => {
            const ep = existing?.projectTargets.find(pt => pt.projectId === p.id);
            return { projectId: p.id, weeklyTargetHours: ep?.weeklyTargetHours ?? p.weeklyTargetHours ?? 0 };
        });
        // Area total is always derived from project targets if there are projects
        const derivedHours = areaProjects.length > 0
            ? projectTargets.reduce((s, p) => s + p.weeklyTargetHours, 0)
            : (existing?.weeklyTargetHours ?? area.weeklyTargetHours);
        return {
            focusAreaId: area.id,
            weeklyTargetHours: derivedHours,
            projectTargets,
        };
    });
}
export default function WeekTemplates() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [view, setView] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [confirmApplyId, setConfirmApplyId] = useState(null);
    const [applied, setApplied] = useState(null);
    // ── Editor state ──────────────────────────────────────────────────────────
    const [tName, setTName] = useState('');
    const [tDescription, setTDescription] = useState('');
    const [tTargets, setTTargets] = useState([]);
    const [expandedAreas, setExpandedAreas] = useState(new Set());
    const [rawHours, setRawHours] = useState({});
    const openNew = () => {
        setEditingId(null);
        setTName('');
        setTDescription('');
        const targets = buildInitialTargets(state.focusAreas, state.projects);
        setTTargets(targets);
        // Auto-expand areas that have projects so users can set project-level hours
        const withProjects = new Set(state.focusAreas
            .filter(a => state.projects.some(p => p.focusAreaId === a.id))
            .map(a => a.id));
        setExpandedAreas(withProjects);
        setView('editor');
    };
    const openEdit = (template) => {
        setEditingId(template.id);
        setTName(template.name);
        setTDescription(template.description);
        const targets = buildInitialTargets(state.focusAreas, state.projects, template);
        setTTargets(targets);
        const withProjects = new Set(state.focusAreas
            .filter(a => state.projects.some(p => p.focusAreaId === a.id))
            .map(a => a.id));
        setExpandedAreas(withProjects);
        setView('editor');
    };
    const save = () => {
        if (!tName.trim() || totalEditorHours > MAX_WEEKLY_HOURS)
            return;
        const now = new Date().toISOString();
        if (editingId) {
            const base = state.weekTemplates.find(t => t.id === editingId);
            dispatch({ type: 'UPDATE_WEEK_TEMPLATE', payload: { ...base, name: tName.trim(), description: tDescription.trim(), focusAreaTargets: tTargets } });
        }
        else {
            dispatch({ type: 'ADD_WEEK_TEMPLATE', payload: { id: generateId(), name: tName.trim(), description: tDescription.trim(), focusAreaTargets: tTargets, createdAt: now } });
        }
        setView('list');
    };
    const applyTemplate = (id) => {
        const name = state.weekTemplates.find(t => t.id === id)?.name ?? '';
        dispatch({ type: 'APPLY_WEEK_TEMPLATE', payload: id });
        setConfirmApplyId(null);
        setApplied(name);
        setTimeout(() => setApplied(null), 3000);
    };
    // ── Editor helpers ────────────────────────────────────────────────────────
    const setAreaHours = (areaId, hours) => setTTargets(prev => prev.map(t => t.focusAreaId === areaId ? { ...t, weeklyTargetHours: hours } : t));
    const setProjectHours = (areaId, projectId, hours) => setTTargets(prev => prev.map(t => {
        if (t.focusAreaId !== areaId)
            return t;
        const newProjectTargets = t.projectTargets.map(p => p.projectId === projectId ? { ...p, weeklyTargetHours: hours } : p);
        // Area total is always the sum of its project targets
        const areaTotal = newProjectTargets.reduce((s, p) => s + p.weeklyTargetHours, 0);
        return { ...t, projectTargets: newProjectTargets, weeklyTargetHours: areaTotal };
    }));
    const toggleArea = (areaId) => setExpandedAreas(prev => {
        const next = new Set(prev);
        next.has(areaId) ? next.delete(areaId) : next.add(areaId);
        return next;
    });
    const totalEditorHours = tTargets.reduce((s, t) => s + t.weeklyTargetHours, 0);
    const overLimit = totalEditorHours > MAX_WEEKLY_HOURS;
    // ─────────────────────────────────────────────────────────────────────────
    // EDITOR VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'editor') {
        return (_jsxs("div", { children: [_jsxs("button", { className: "back-btn", onClick: () => setView('list'), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" }) }), "Templates"] }), _jsx("div", { className: "section-header", children: _jsx("span", { className: "section-title", children: editingId ? 'Edit Template' : 'New Template' }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Template Name *" }), _jsx("input", { className: "form-input", value: tName, onChange: e => setTName(e.target.value), placeholder: "e.g. Normal work week, Holiday hiking\u2026", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("input", { className: "form-input", value: tDescription, onChange: e => setTDescription(e.target.value), placeholder: "Optional \u2014 when do you use this template?" })] }), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Focus Area Targets" }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: _jsxs("span", { className: "tmpl-total-badge", style: {
                                    background: overLimit ? 'var(--danger, #e53e3e)' : 'var(--primary)',
                                    color: '#fff',
                                    borderRadius: 12,
                                    padding: '2px 10px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                }, children: [totalEditorHours, "h / ", MAX_WEEKLY_HOURS, "h"] }) })] }), overLimit && (_jsxs("div", { style: {
                        background: 'rgba(229, 62, 62, 0.12)',
                        border: '1px solid rgba(229, 62, 62, 0.4)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 12,
                        fontSize: 13,
                        color: 'var(--danger, #e53e3e)',
                    }, children: ["Total exceeds ", MAX_WEEKLY_HOURS, "h/week (24 \u00D7 7). Reduce targets before saving."] })), state.focusAreas.length === 0 && (_jsx("p", { className: "text-secondary text-sm", style: { textAlign: 'center', padding: '24px 0' }, children: "Add focus areas first to set targets." })), tTargets.map(target => {
                    const area = state.focusAreas.find(a => a.id === target.focusAreaId);
                    if (!area)
                        return null;
                    const areaProjects = state.projects.filter(p => p.focusAreaId === area.id && p.status !== 'completed');
                    const hasProjects = areaProjects.length > 0;
                    const isExpanded = expandedAreas.has(area.id);
                    return (_jsxs("div", { className: "tmpl-area-block", children: [_jsxs("div", { className: "tmpl-area-row", children: [_jsxs("div", { className: "allocation-name", children: [_jsx("span", { className: "dot", style: { background: area.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' } }), _jsx("span", { children: area.name })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [hasProjects ? (
                                            // Read-only sum derived from project targets
                                            _jsxs("span", { style: {
                                                    minWidth: 52,
                                                    textAlign: 'right',
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    color: 'var(--text)',
                                                }, children: [target.weeklyTargetHours, "h"] })) : (
                                            // Editable when no projects exist
                                            _jsx("input", { className: "form-input tmpl-hours-input", type: "number", value: rawHours[area.id] ?? String(target.weeklyTargetHours), onChange: e => {
                                                    const raw = e.target.value;
                                                    const v = parseFloat(raw);
                                                    setRawHours(prev => ({ ...prev, [area.id]: raw }));
                                                    if (!isNaN(v))
                                                        setAreaHours(area.id, v);
                                                }, onBlur: () => {
                                                    const raw = rawHours[area.id];
                                                    if (raw !== undefined) {
                                                        const v = parseFloat(raw);
                                                        setAreaHours(area.id, isNaN(v) ? 0 : v);
                                                        setRawHours(prev => { const n = { ...prev }; delete n[area.id]; return n; });
                                                    }
                                                }, min: "0", step: "0.5" })), _jsx("span", { className: "text-secondary", style: { fontSize: 12, width: 26 }, children: "h/w" }), hasProjects && (_jsx("button", { className: "tmpl-expand-btn", onClick: () => toggleArea(area.id), children: _jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", style: { transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }, children: _jsx("path", { d: "M7 10l5 5 5-5z" }) }) }))] })] }), isExpanded && (_jsx("div", { className: "tmpl-projects", children: areaProjects.map(project => {
                                    const pt = target.projectTargets.find(p => p.projectId === project.id);
                                    return (_jsxs("div", { className: "tmpl-project-row", children: [_jsxs("span", { className: "text-secondary", style: { fontSize: 13 }, children: ["\u21B3 ", project.name] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { className: "form-input tmpl-hours-input", type: "number", value: rawHours[`${area.id}:${project.id}`] ?? String(pt?.weeklyTargetHours ?? 0), onChange: e => {
                                                            const raw = e.target.value;
                                                            const key = `${area.id}:${project.id}`;
                                                            const v = parseFloat(raw);
                                                            setRawHours(prev => ({ ...prev, [key]: raw }));
                                                            if (!isNaN(v))
                                                                setProjectHours(area.id, project.id, v);
                                                        }, onBlur: () => {
                                                            const key = `${area.id}:${project.id}`;
                                                            const raw = rawHours[key];
                                                            if (raw !== undefined) {
                                                                const v = parseFloat(raw);
                                                                setProjectHours(area.id, project.id, isNaN(v) ? 0 : v);
                                                                setRawHours(prev => { const n = { ...prev }; delete n[key]; return n; });
                                                            }
                                                        }, min: "0", step: "0.5" }), _jsx("span", { className: "text-secondary", style: { fontSize: 12, width: 26 }, children: "h/w" }), _jsx("div", { style: { width: 28 } })] })] }, project.id));
                                }) }))] }, area.id));
                }), _jsxs("div", { className: "modal-actions mt-16", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setView('list'), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: save, disabled: !tName.trim() || overLimit, children: editingId ? 'Save Changes' : 'Create Template' })] })] }));
    }
    // ─────────────────────────────────────────────────────────────────────────
    // LIST VIEW
    // ─────────────────────────────────────────────────────────────────────────
    return (_jsxs("div", { children: [_jsxs("button", { className: "back-btn", onClick: () => navigate('/track'), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" }) }), "Tracking"] }), _jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Week Templates" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: openNew, children: "+ New" })] }), applied && (_jsxs("div", { className: "tmpl-applied-banner", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }), _jsx("strong", { children: applied }), " applied \u2014 targets updated for this week"] })), state.weekTemplates.length === 0 && (_jsxs("div", { className: "tmpl-empty", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" }) }), _jsx("p", { children: "Templates let you define named week types \u2014 work weeks, holidays, hiking weekends \u2014 each with their own time targets. Apply one every Sunday to plan the week ahead." }), _jsx("button", { className: "btn btn-primary", onClick: openNew, style: { marginTop: 16 }, children: "Create First Template" })] })), state.weekTemplates.map(template => {
                const totalHours = template.focusAreaTargets.reduce((s, t) => s + t.weeklyTargetHours, 0);
                const lastUsedText = template.lastUsedAt
                    ? `Last applied ${new Date(template.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                    : 'Never applied';
                const activeTargets = template.focusAreaTargets.filter(t => t.weeklyTargetHours > 0);
                return (_jsxs("div", { className: "tmpl-card", children: [_jsxs("div", { className: "tmpl-card-top", children: [_jsxs("div", { children: [_jsx("div", { className: "tmpl-name", children: template.name }), template.description && (_jsx("div", { className: "text-secondary text-sm", style: { marginTop: 2 }, children: template.description }))] }), _jsxs("div", { className: "tmpl-total-hours", children: [totalHours, "h/w"] })] }), _jsx("div", { className: "tmpl-chips", children: activeTargets.map(target => {
                                const area = state.focusAreas.find(a => a.id === target.focusAreaId);
                                if (!area)
                                    return null;
                                const projCount = target.projectTargets.filter(p => p.weeklyTargetHours > 0).length;
                                return (_jsxs("span", { className: "tmpl-chip", style: { borderColor: `${area.color}55`, color: area.color }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: area.color, display: 'inline-block', flexShrink: 0 } }), area.name, " ", target.weeklyTargetHours, "h", projCount > 0 && _jsxs("span", { style: { opacity: 0.65, fontSize: 10 }, children: [" +", projCount, "p"] })] }, target.focusAreaId));
                            }) }), _jsxs("div", { className: "tmpl-card-footer", children: [_jsx("span", { className: "text-secondary", style: { fontSize: 11 }, children: lastUsedText }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => {
                                                if (window.confirm(`Delete "${template.name}"?`)) {
                                                    dispatch({ type: 'DELETE_WEEK_TEMPLATE', payload: template.id });
                                                }
                                            }, children: _jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" }) }) }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => openEdit(template), children: "Edit" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => setConfirmApplyId(template.id), children: "Apply this week" })] })] })] }, template.id));
            }), confirmApplyId && (() => {
                const template = state.weekTemplates.find(t => t.id === confirmApplyId);
                const totalHours = template.focusAreaTargets.reduce((s, t) => s + t.weeklyTargetHours, 0);
                return (_jsxs(Modal, { title: "Apply Template", onClose: () => setConfirmApplyId(null), children: [_jsxs("p", { className: "text-secondary text-sm mb-16", children: ["Apply ", _jsx("strong", { style: { color: 'var(--text)' }, children: template.name }), " to this week? Weekly targets for all focus areas and realizations will be updated."] }), _jsxs("div", { className: "tmpl-apply-preview", children: [template.focusAreaTargets.filter(t => t.weeklyTargetHours > 0).map(target => {
                                    const area = state.focusAreas.find(a => a.id === target.focusAreaId);
                                    if (!area)
                                        return null;
                                    return (_jsxs("div", { className: "tmpl-preview-row", children: [_jsxs("div", { className: "allocation-name", style: { fontSize: 13 }, children: [_jsx("span", { className: "dot", style: { background: area.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' } }), area.name] }), _jsxs("span", { style: { fontSize: 13, fontWeight: 700, color: area.color }, children: [target.weeklyTargetHours, "h"] })] }, target.focusAreaId));
                                }), _jsxs("div", { className: "tmpl-preview-total", children: [_jsx("span", { children: "Total" }), _jsxs("span", { style: { fontWeight: 700 }, children: [totalHours, "h/week"] })] })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setConfirmApplyId(null), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: () => applyTemplate(confirmApplyId), children: "Apply" })] })] }));
            })()] }));
}
