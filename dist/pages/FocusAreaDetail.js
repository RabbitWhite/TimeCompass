import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, getIconSvg, formatDuration, isThisWeek } from '../utils';
export default function FocusAreaDetail() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const area = state.focusAreas.find(a => a.id === id);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [pName, setPName] = useState('');
    const [pDesc, setPDesc] = useState('');
    const [pGithub, setPGithub] = useState('');
    const [pTrello, setPTrello] = useState('');
    const [pStatus, setPStatus] = useState('active');
    if (!area) {
        return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/areas'), children: "\u2190 Back" }), _jsx("div", { className: "empty-state", children: _jsx("p", { children: "Focus area not found." }) })] }));
    }
    const projects = state.projects.filter(p => p.focusAreaId === area.id);
    const weekMins = state.timeEntries
        .filter(e => e.focusAreaId === area.id && isThisWeek(e.startTime))
        .reduce((s, e) => s + e.duration, 0);
    const openNew = () => {
        setEditing(null);
        setPName('');
        setPDesc('');
        setPGithub('');
        setPTrello('');
        setPStatus('active');
        setShowForm(true);
    };
    const openEdit = (project) => {
        setEditing(project);
        setPName(project.name);
        setPDesc(project.description);
        setPGithub(project.githubUrl);
        setPTrello(project.trelloUrl);
        setPStatus(project.status);
        setShowForm(true);
    };
    const save = () => {
        if (!pName.trim())
            return;
        const project = {
            id: editing?.id || generateId(),
            focusAreaId: area.id,
            name: pName.trim(),
            description: pDesc.trim(),
            githubUrl: pGithub.trim(),
            trelloUrl: pTrello.trim(),
            status: pStatus,
            createdAt: editing?.createdAt || new Date().toISOString(),
        };
        dispatch({ type: editing ? 'UPDATE_PROJECT' : 'ADD_PROJECT', payload: project });
        setShowForm(false);
    };
    return (_jsxs("div", { children: [_jsx("button", { className: "back-btn", onClick: () => navigate('/areas'), children: "\u2190 Focus Areas" }), _jsxs("div", { className: "card", style: { borderLeft: `4px solid ${area.color}` }, children: [_jsxs("div", { className: "card-header", children: [_jsx("div", { className: "area-icon", style: { background: area.color }, children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: getIconSvg(area.icon) }) }) }), _jsxs("div", { children: [_jsx("div", { className: "card-title", children: area.name }), _jsx("div", { className: "card-subtitle", children: area.description })] })] }), _jsxs("div", { className: "flex-between mt-8", children: [_jsxs("span", { className: "tag", children: [formatDuration(weekMins), " this week"] }), _jsxs("span", { className: "tag", children: ["Target: ", area.weeklyTargetHours, "h/wk"] })] })] }), _jsxs("div", { className: "section-header mt-16", children: [_jsx("span", { className: "section-title", children: "Realizations" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: openNew, children: "+ Add" })] }), projects.map(project => (_jsxs("div", { className: "project-card", onClick: () => openEdit(project), children: [_jsxs("div", { className: "flex-between", children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: project.name }), _jsx("span", { className: `project-status ${project.status}`, children: project.status })] }), project.description && (_jsx("div", { className: "text-secondary text-sm mt-8", children: project.description })), _jsxs("div", { className: "project-links", children: [project.githubUrl && (_jsxs("a", { href: project.githubUrl, target: "_blank", rel: "noopener noreferrer", className: "project-link", onClick: e => e.stopPropagation(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" }) }), "GitHub"] })), project.trelloUrl && (_jsxs("a", { href: project.trelloUrl, target: "_blank", rel: "noopener noreferrer", className: "project-link", onClick: e => e.stopPropagation(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H7V7h4v8zm6-4h-4V7h4v4z" }) }), "Trello"] }))] })] }, project.id))), projects.length === 0 && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No realizations yet. Add a realization to get started." }) })), showForm && (_jsxs(Modal, { title: editing ? 'Edit Realization' : 'New Realization', onClose: () => setShowForm(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Realization Name" }), _jsx("input", { className: "form-input", value: pName, onChange: e => setPName(e.target.value), placeholder: "e.g. My Platformer Game", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-textarea", value: pDesc, onChange: e => setPDesc(e.target.value), placeholder: "Brief description...", rows: 2 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: pStatus, onChange: e => setPStatus(e.target.value), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" }), _jsx("option", { value: "completed", children: "Completed" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "GitHub URL" }), _jsx("input", { className: "form-input", value: pGithub, onChange: e => setPGithub(e.target.value), placeholder: "https://github.com/user/repo" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Trello URL" }), _jsx("input", { className: "form-input", value: pTrello, onChange: e => setPTrello(e.target.value), placeholder: "https://trello.com/b/..." })] }), _jsxs("div", { className: "modal-actions", children: [editing && (_jsx("button", { className: "btn btn-danger", onClick: () => {
                                    dispatch({ type: 'DELETE_PROJECT', payload: editing.id });
                                    setShowForm(false);
                                }, children: "Delete" })), _jsx("button", { className: "btn btn-primary", onClick: save, children: editing ? 'Save' : 'Create' })] })] }))] }));
}
