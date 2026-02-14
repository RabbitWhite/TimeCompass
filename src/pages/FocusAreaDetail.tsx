import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, getIconSvg, formatDuration, isThisWeek } from '../utils';
import type { Project } from '../types';

export default function FocusAreaDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const area = state.focusAreas.find(a => a.id === id);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pGithub, setPGithub] = useState('');
  const [pTrello, setPTrello] = useState('');
  const [pStatus, setPStatus] = useState<Project['status']>('active');

  if (!area) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/areas')}>
          &larr; Back
        </button>
        <div className="empty-state">
          <p>Focus area not found.</p>
        </div>
      </div>
    );
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

  const openEdit = (project: Project) => {
    setEditing(project);
    setPName(project.name);
    setPDesc(project.description);
    setPGithub(project.githubUrl);
    setPTrello(project.trelloUrl);
    setPStatus(project.status);
    setShowForm(true);
  };

  const save = () => {
    if (!pName.trim()) return;
    const project: Project = {
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

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/areas')}>
        &larr; Focus Areas
      </button>

      <div className="card" style={{ borderLeft: `4px solid ${area.color}` }}>
        <div className="card-header">
          <div className="area-icon" style={{ background: area.color }}>
            <svg viewBox="0 0 24 24"><path d={getIconSvg(area.icon)} /></svg>
          </div>
          <div>
            <div className="card-title">{area.name}</div>
            <div className="card-subtitle">{area.description}</div>
          </div>
        </div>
        <div className="flex-between mt-8">
          <span className="tag">{formatDuration(weekMins)} this week</span>
          <span className="tag">Target: {area.weeklyTargetHours}h/wk</span>
        </div>
      </div>

      <div className="section-header mt-16">
        <span className="section-title">Projects</span>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add</button>
      </div>

      {projects.map(project => (
        <div className="project-card" key={project.id} onClick={() => openEdit(project)}>
          <div className="flex-between">
            <span style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</span>
            <span className={`project-status ${project.status}`}>{project.status}</span>
          </div>
          {project.description && (
            <div className="text-secondary text-sm mt-8">{project.description}</div>
          )}
          <div className="project-links">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link"
                onClick={e => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                </svg>
                GitHub
              </a>
            )}
            {project.trelloUrl && (
              <a
                href={project.trelloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link"
                onClick={e => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H7V7h4v8zm6-4h-4V7h4v4z" />
                </svg>
                Trello
              </a>
            )}
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div className="empty-state">
          <p>No projects yet. Add a project to get started.</p>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Project' : 'New Project'} onClose={() => setShowForm(false)}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input
              className="form-input"
              value={pName}
              onChange={e => setPName(e.target.value)}
              placeholder="e.g. My Platformer Game"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={pDesc}
              onChange={e => setPDesc(e.target.value)}
              placeholder="Brief description..."
              rows={2}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={pStatus} onChange={e => setPStatus(e.target.value as Project['status'])}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">GitHub URL</label>
            <input
              className="form-input"
              value={pGithub}
              onChange={e => setPGithub(e.target.value)}
              placeholder="https://github.com/user/repo"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Trello URL</label>
            <input
              className="form-input"
              value={pTrello}
              onChange={e => setPTrello(e.target.value)}
              placeholder="https://trello.com/b/..."
            />
          </div>
          <div className="modal-actions">
            {editing && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  dispatch({ type: 'DELETE_PROJECT', payload: editing.id });
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
