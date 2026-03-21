import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.js';
import Modal from '../components/Modal.js';
import { generateId, getIconSvg, isThisWeek, formatDuration } from '../utils.js';
import { AREA_COLORS, AREA_ICONS } from '../types.js';
export default function FocusAreas() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(AREA_COLORS[0]);
    const [icon, setIcon] = useState(AREA_ICONS[0]);
    const [targetHours, setTargetHours] = useState('10');
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
    return (_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Focus Areas" }), _jsxs("span", { className: "text-secondary text-sm", children: [state.focusAreas.length, " areas"] })] }), state.focusAreas.map(area => {
                const projects = state.projects.filter(p => p.focusAreaId === area.id);
                const weekMins = state.timeEntries
                    .filter(e => e.focusAreaId === area.id && isThisWeek(e.startTime))
                    .reduce((s, e) => s + e.duration, 0);
                return (_jsxs("div", { className: "card", onClick: () => navigate(`/areas/${area.id}`), children: [_jsxs("div", { className: "card-header", children: [_jsx("div", { className: "area-icon", style: { background: area.color }, children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: getIconSvg(area.icon) }) }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { className: "card-title truncate", children: area.name }), _jsxs("div", { className: "card-subtitle", children: [projects.length, " realization", projects.length !== 1 ? 's' : '', ' \u2022 ', formatDuration(weekMins), " this week"] })] }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: (e) => openEdit(area, e), children: _jsx("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "currentColor", children: _jsx("path", { d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" }) }) })] }), area.description && (_jsx("div", { className: "text-secondary text-sm truncate", children: area.description })), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx("div", { className: "bar-track", children: _jsx("div", { className: "bar-fill", style: {
                                            width: `${Math.min(100, area.weeklyTargetHours > 0 ? (weekMins / (area.weeklyTargetHours * 60)) * 100 : 0)}%`,
                                            background: area.color,
                                        } }) }), _jsxs("div", { className: "flex-between mt-8", children: [_jsx("span", { className: "text-sm text-secondary", children: formatDuration(weekMins) }), _jsxs("span", { className: "text-sm text-secondary", children: ["Target: ", area.weeklyTargetHours, "h/wk"] })] })] })] }, area.id));
            }), state.focusAreas.length === 0 && (_jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" }) }), _jsxs("p", { children: ["No focus areas yet.", _jsx("br", {}), "Tap + to add your first area."] })] })), _jsx("button", { className: "fab", onClick: openNew, children: "+" }), showForm && (_jsxs(Modal, { title: editing ? 'Edit Focus Area' : 'New Focus Area', onClose: () => setShowForm(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Name" }), _jsx("input", { className: "form-input", value: name, onChange: e => setName(e.target.value), placeholder: "e.g. Game Development", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-textarea", value: description, onChange: e => setDescription(e.target.value), placeholder: "What does this area cover?", rows: 2 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Weekly Target Hours" }), _jsx("input", { className: "form-input", type: "number", value: targetHours, onChange: e => setTargetHours(e.target.value), min: "0", step: "0.5" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Color" }), _jsx("div", { className: "color-grid", children: AREA_COLORS.map(c => (_jsx("button", { className: `color-swatch ${color === c ? 'selected' : ''}`, style: { background: c }, onClick: () => setColor(c) }, c))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Icon" }), _jsx("div", { className: "icon-grid", children: AREA_ICONS.map(i => (_jsx("button", { className: `icon-option ${icon === i ? 'selected' : ''}`, onClick: () => setIcon(i), children: _jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: getIconSvg(i) }) }) }, i))) })] }), _jsxs("div", { className: "modal-actions", children: [editing && (_jsx("button", { className: "btn btn-danger", onClick: () => {
                                    dispatch({ type: 'DELETE_FOCUS_AREA', payload: editing.id });
                                    setShowForm(false);
                                }, children: "Delete" })), _jsx("button", { className: "btn btn-primary", onClick: save, children: editing ? 'Save' : 'Create' })] })] }))] }));
}
