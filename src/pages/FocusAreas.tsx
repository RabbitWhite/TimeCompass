import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, getIconSvg, isThisWeek, formatDuration } from '../utils';
import { AREA_COLORS, AREA_ICONS, type FocusArea } from '../types';

export default function FocusAreas() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FocusArea | null>(null);

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

  const openEdit = (area: FocusArea, e: React.MouseEvent) => {
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
    if (!name.trim()) return;
    const area: FocusArea = {
      id: editing?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      weeklyTargetHours: parseFloat(targetHours) || 0,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    dispatch({ type: editing ? 'UPDATE_FOCUS_AREA' : 'ADD_FOCUS_AREA', payload: area });
    setShowForm(false);
  };

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Focus Areas</span>
        <span className="text-secondary text-sm">{state.focusAreas.length} areas</span>
      </div>

      {state.focusAreas.map(area => {
        const projects = state.projects.filter(p => p.focusAreaId === area.id);
        const weekMins = state.timeEntries
          .filter(e => e.focusAreaId === area.id && isThisWeek(e.startTime))
          .reduce((s, e) => s + e.duration, 0);

        return (
          <div className="card" key={area.id} onClick={() => navigate(`/areas/${area.id}`)}>
            <div className="card-header">
              <div className="area-icon" style={{ background: area.color }}>
                <svg viewBox="0 0 24 24"><path d={getIconSvg(area.icon)} /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-title truncate">{area.name}</div>
                <div className="card-subtitle">
                  {projects.length} realization{projects.length !== 1 ? 's' : ''}
                  {' \u2022 '}
                  {formatDuration(weekMins)} this week
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={(e) => openEdit(area, e)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            </div>
            {area.description && (
              <div className="text-secondary text-sm truncate">{area.description}</div>
            )}
            <div style={{ marginTop: 8 }}>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(100, area.weeklyTargetHours > 0 ? (weekMins / (area.weeklyTargetHours * 60)) * 100 : 0)}%`,
                    background: area.color,
                  }}
                />
              </div>
              <div className="flex-between mt-8">
                <span className="text-sm text-secondary">{formatDuration(weekMins)}</span>
                <span className="text-sm text-secondary">Target: {area.weeklyTargetHours}h/wk</span>
              </div>
            </div>
          </div>
        );
      })}

      {state.focusAreas.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          <p>No focus areas yet.<br />Tap + to add your first area.</p>
        </div>
      )}

      <button className="fab" onClick={openNew}>+</button>

      {showForm && (
        <Modal title={editing ? 'Edit Focus Area' : 'New Focus Area'} onClose={() => setShowForm(false)}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Game Development"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this area cover?"
              rows={2}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Weekly Target Hours</label>
            <input
              className="form-input"
              type="number"
              value={targetHours}
              onChange={e => setTargetHours(e.target.value)}
              min="0"
              step="0.5"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-grid">
              {AREA_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-grid">
              {AREA_ICONS.map(i => (
                <button
                  key={i}
                  className={`icon-option ${icon === i ? 'selected' : ''}`}
                  onClick={() => setIcon(i)}
                >
                  <svg viewBox="0 0 24 24"><path d={getIconSvg(i)} /></svg>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            {editing && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  dispatch({ type: 'DELETE_FOCUS_AREA', payload: editing.id });
                  setShowForm(false);
                }}
              >
                Delete
              </button>
            )}
            <button className="btn btn-primary" onClick={save}>
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
