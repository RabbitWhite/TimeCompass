import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, getIconSvg } from '../utils';
import { AREA_COLORS, AREA_ICONS } from '../types';
export default function FocusAreas() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [expandedAreaId, setExpandedAreaId] = useState(null);
    // Project form state (inlined from FocusAreaDetail)
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [projectAreaId, setProjectAreaId] = useState('');
    const [pName, setPName] = useState('');
    const [pDesc, setPDesc] = useState('');
    const [pGithub, setPGithub] = useState('');
    const [pTrello, setPTrello] = useState('');
    const [pStatus, setPStatus] = useState('active');
    // Area form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(AREA_COLORS[0]);
    const [icon, setIcon] = useState(AREA_ICONS[0]);
    const [targetHours, setTargetHours] = useState('10');
    // Inline target editing per area
    const [editingTarget, setEditingTarget] = useState({});
    const openNew = () => {
        setEditing(null);
        setName('');
        setDescription('');
        setColor(AREA_COLORS[0]);
        setIcon(AREA_ICONS[0]);
        setTargetHours('10');
        setShowForm(true);
    };
    const openEdit = (area, e) => {
        e.stopPropagation();
        setEditing(area);
        setName(area.name);
        setDescription(area.description);
        setColor(area.color);
        setIcon(area.icon);
        setTargetHours(String(area.weeklyTargetHours));
        setShowForm(true);
    };
    const save = () => {
        if (!name.trim())
            return;
        const isNew = !editing;
        const areaId = editing?.id || generateId();
        const area = {
            id: areaId,
            name: name.trim(),
            description: description.trim(),
            color,
            icon,
            weeklyTargetHours: parseFloat(targetHours) || 0,
            createdAt: editing?.createdAt || new Date().toISOString(),
        };
        dispatch({ type: isNew ? 'ADD_FOCUS_AREA' : 'UPDATE_FOCUS_AREA', payload: area });
        if (isNew) {
            dispatch({
                type: 'ADD_PROJECT',
                payload: {
                    id: generateId(),
                    focusAreaId: areaId,
                    name: 'Default',
                    description: '',
                    githubUrl: '',
                    trelloUrl: '',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                },
            });
        }
        setShowForm(false);
    };
    const openNewProject = (areaId) => {
        setEditingProject(null);
        setProjectAreaId(areaId);
        setPName('');
        setPDesc('');
        setPGithub('');
        setPTrello('');
        setPStatus('active');
        setShowProjectForm(true);
    };
    const openEditProject = (project) => {
        setEditingProject(project);
        setProjectAreaId(project.focusAreaId);
        setPName(project.name);
        setPDesc(project.description);
        setPGithub(project.githubUrl);
        setPTrello(project.trelloUrl);
        setPStatus(project.status);
        setShowProjectForm(true);
    };
    const saveProject = () => {
        if (!pName.trim())
            return;
        const project = {
            id: editingProject?.id || generateId(),
            focusAreaId: projectAreaId,
            name: pName.trim(),
            description: pDesc.trim(),
            githubUrl: pGithub.trim(),
            trelloUrl: pTrello.trim(),
            status: pStatus,
            createdAt: editingProject?.createdAt || new Date().toISOString(),
        };
        dispatch({ type: editingProject ? 'UPDATE_PROJECT' : 'ADD_PROJECT', payload: project });
        setShowProjectForm(false);
    };
    const saveTarget = (area, value) => {
        const hours = parseFloat(value) || 0;
        if (hours !== area.weeklyTargetHours) {
            dispatch({ type: 'UPDATE_FOCUS_AREA', payload: { ...area, weeklyTargetHours: hours } });
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Focus Areas" }), _jsxs("button", { className: "btn btn-ghost btn-sm", onClick: () => navigate('/templates'), style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "15", height: "15", fill: "currentColor", children: _jsx("path", { d: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-5 8v-2h8v2H8zm0-4v-2h8v2H8zm0-4V7h3v2H8z" }) }), "Manage Templates"] })] }), state.focusAreas.map(area => {
                const projects = state.projects.filter(p => p.focusAreaId === area.id);
                const isExpanded = expandedAreaId === area.id;
                return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header", onClick: () => setExpandedAreaId(isExpanded ? null : area.id), style: { cursor: 'pointer' }, children: [_jsx("div", { className: "area-icon", style: { background: area.color }, children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: getIconSvg(area.icon) }) }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { className: "card-title truncate", children: area.name }), _jsx("div", { className: "card-subtitle", children: area.description || '\u00a0' })] }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: (e) => openEdit(area, e), children: _jsx("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "currentColor", children: _jsx("path", { d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" }) }) })] }), isExpanded && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Weekly target hours" }), _jsx("input", { className: "form-input", type: "number", value: editingTarget[area.id] ?? String(area.weeklyTargetHours), onChange: e => setEditingTarget({ ...editingTarget, [area.id]: e.target.value }), onBlur: e => saveTarget(area, e.target.value), min: "0", step: "0.5" })] }), _jsxs("div", { className: "section-header", style: { marginTop: 8 }, children: [_jsx("span", { className: "section-title", style: { fontSize: 13 }, children: "Realizations" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => openNewProject(area.id), children: "+ Add" })] }), projects.map(project => (_jsxs("div", { className: "project-card", onClick: () => openEditProject(project), children: [_jsxs("div", { className: "flex-between", children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: project.name }), _jsx("span", { className: `project-status ${project.status}`, children: project.status })] }), project.description && (_jsx("div", { className: "text-secondary text-sm mt-8", children: project.description })), _jsxs("div", { className: "project-links", children: [project.githubUrl && (_jsxs("a", { href: project.githubUrl, target: "_blank", rel: "noopener noreferrer", className: "project-link", onClick: e => e.stopPropagation(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" }) }), "GitHub"] })), project.trelloUrl && (_jsxs("a", { href: project.trelloUrl, target: "_blank", rel: "noopener noreferrer", className: "project-link", onClick: e => e.stopPropagation(), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H7V7h4v8zm6-4h-4V7h4v4z" }) }), "Trello"] }))] })] }, project.id))), projects.length === 0 && (_jsx("div", { className: "text-secondary text-sm", style: { textAlign: 'center', padding: 8 }, children: "No realizations yet." }))] }))] }, area.id));
            }), state.focusAreas.length === 0 && (_jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" }) }), _jsxs("p", { children: ["No focus areas yet.", _jsx("br", {}), "Tap + to add your first area."] })] })), _jsx("button", { className: "fab", onClick: openNew, children: "+" }), showForm && (_jsxs(Modal, { title: editing ? 'Edit Focus Area' : 'New Focus Area', onClose: () => setShowForm(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Name" }), _jsx("input", { className: "form-input", value: name, onChange: e => setName(e.target.value), placeholder: "e.g. Game Development", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-textarea", value: description, onChange: e => setDescription(e.target.value), placeholder: "What does this area cover?", rows: 2 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Weekly Target Hours" }), _jsx("input", { className: "form-input", type: "number", value: targetHours, onChange: e => setTargetHours(e.target.value), min: "0", step: "0.5" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Color" }), _jsx("div", { className: "color-grid", children: AREA_COLORS.map(c => (_jsx("button", { className: `color-swatch ${color === c ? 'selected' : ''}`, style: { background: c }, onClick: () => setColor(c) }, c))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Icon" }), _jsx("div", { className: "icon-grid", children: AREA_ICONS.map(i => (_jsx("button", { className: `icon-option ${icon === i ? 'selected' : ''}`, onClick: () => setIcon(i), children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: getIconSvg(i) }) }) }, i))) })] }), _jsxs("div", { className: "modal-actions", children: [editing && (_jsx("button", { className: "btn btn-danger", onClick: () => {
                                    dispatch({ type: 'DELETE_FOCUS_AREA', payload: editing.id });
                                    setShowForm(false);
                                }, children: "Delete" })), _jsx("button", { className: "btn btn-primary", onClick: save, children: editing ? 'Save' : 'Create' })] })] })), showProjectForm && (_jsxs(Modal, { title: editingProject ? 'Edit Realization' : 'New Realization', onClose: () => setShowProjectForm(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Realization Name" }), _jsx("input", { className: "form-input", value: pName, onChange: e => setPName(e.target.value), placeholder: "e.g. My Platformer Game", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-textarea", value: pDesc, onChange: e => setPDesc(e.target.value), placeholder: "Brief description...", rows: 2 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: pStatus, onChange: e => setPStatus(e.target.value), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "paused", children: "Paused" }), _jsx("option", { value: "completed", children: "Completed" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "GitHub URL" }), _jsx("input", { className: "form-input", value: pGithub, onChange: e => setPGithub(e.target.value), placeholder: "https://github.com/user/repo" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Trello URL" }), _jsx("input", { className: "form-input", value: pTrello, onChange: e => setPTrello(e.target.value), placeholder: "https://trello.com/b/..." })] }), _jsxs("div", { className: "modal-actions", children: [editingProject && (_jsx("button", { className: "btn btn-danger", onClick: () => { dispatch({ type: 'DELETE_PROJECT', payload: editingProject.id }); setShowProjectForm(false); }, children: "Delete" })), _jsx("button", { className: "btn btn-primary", onClick: saveProject, children: editingProject ? 'Save' : 'Create' })] })] }))] }));
}
