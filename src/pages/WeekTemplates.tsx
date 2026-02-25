import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId } from '../utils';
import type { WeekTemplate, TemplateFocusAreaTarget } from '../types';

const MAX_WEEKLY_HOURS = 24 * 7; // 168

type View = 'list' | 'editor';

function buildInitialTargets(
  focusAreas: ReturnType<typeof useApp>['state']['focusAreas'],
  projects: ReturnType<typeof useApp>['state']['projects'],
  base?: WeekTemplate
): TemplateFocusAreaTarget[] {
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

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [tName, setTName] = useState('');
  const [tDescription, setTDescription] = useState('');
  const [tTargets, setTTargets] = useState<TemplateFocusAreaTarget[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const openNew = () => {
    setEditingId(null);
    setTName('');
    setTDescription('');
    const targets = buildInitialTargets(state.focusAreas, state.projects);
    setTTargets(targets);
    // Auto-expand areas that have projects so users can set project-level hours
    const withProjects = new Set(
      state.focusAreas
        .filter(a => state.projects.some(p => p.focusAreaId === a.id))
        .map(a => a.id)
    );
    setExpandedAreas(withProjects);
    setView('editor');
  };

  const openEdit = (template: WeekTemplate) => {
    setEditingId(template.id);
    setTName(template.name);
    setTDescription(template.description);
    const targets = buildInitialTargets(state.focusAreas, state.projects, template);
    setTTargets(targets);
    const withProjects = new Set(
      state.focusAreas
        .filter(a => state.projects.some(p => p.focusAreaId === a.id))
        .map(a => a.id)
    );
    setExpandedAreas(withProjects);
    setView('editor');
  };

  const save = () => {
    if (!tName.trim() || totalEditorHours > MAX_WEEKLY_HOURS) return;
    const now = new Date().toISOString();
    if (editingId) {
      const base = state.weekTemplates.find(t => t.id === editingId)!;
      dispatch({ type: 'UPDATE_WEEK_TEMPLATE', payload: { ...base, name: tName.trim(), description: tDescription.trim(), focusAreaTargets: tTargets } });
    } else {
      dispatch({ type: 'ADD_WEEK_TEMPLATE', payload: { id: generateId(), name: tName.trim(), description: tDescription.trim(), focusAreaTargets: tTargets, createdAt: now } });
    }
    setView('list');
  };

  const applyTemplate = (id: string) => {
    const name = state.weekTemplates.find(t => t.id === id)?.name ?? '';
    dispatch({ type: 'APPLY_WEEK_TEMPLATE', payload: id });
    setConfirmApplyId(null);
    setApplied(name);
    setTimeout(() => setApplied(null), 3000);
  };

  // ── Editor helpers ────────────────────────────────────────────────────────
  const setAreaHours = (areaId: string, hours: number) =>
    setTTargets(prev => prev.map(t => t.focusAreaId === areaId ? { ...t, weeklyTargetHours: hours } : t));

  const setProjectHours = (areaId: string, projectId: string, hours: number) =>
    setTTargets(prev => prev.map(t => {
      if (t.focusAreaId !== areaId) return t;
      const newProjectTargets = t.projectTargets.map(p =>
        p.projectId === projectId ? { ...p, weeklyTargetHours: hours } : p
      );
      // Area total is always the sum of its project targets
      const areaTotal = newProjectTargets.reduce((s, p) => s + p.weeklyTargetHours, 0);
      return { ...t, projectTargets: newProjectTargets, weeklyTargetHours: areaTotal };
    }));

  const toggleArea = (areaId: string) =>
    setExpandedAreas(prev => {
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
    return (
      <div>
        <button className="back-btn" onClick={() => setView('list')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Templates
        </button>

        <div className="section-header">
          <span className="section-title">{editingId ? 'Edit Template' : 'New Template'}</span>
        </div>

        <div className="form-group">
          <label className="form-label">Template Name *</label>
          <input
            className="form-input"
            value={tName}
            onChange={e => setTName(e.target.value)}
            placeholder="e.g. Normal work week, Holiday hiking…"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            value={tDescription}
            onChange={e => setTDescription(e.target.value)}
            placeholder="Optional — when do you use this template?"
          />
        </div>

        <div className="section-header mt-16">
          <span className="section-title">Focus Area Targets</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="tmpl-total-badge"
              style={{
                background: overLimit ? 'var(--danger, #e53e3e)' : 'var(--primary)',
                color: '#fff',
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {totalEditorHours}h / {MAX_WEEKLY_HOURS}h
            </span>
          </div>
        </div>

        {overLimit && (
          <div style={{
            background: 'rgba(229, 62, 62, 0.12)',
            border: '1px solid rgba(229, 62, 62, 0.4)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 13,
            color: 'var(--danger, #e53e3e)',
          }}>
            Total exceeds {MAX_WEEKLY_HOURS}h/week (24 × 7). Reduce targets before saving.
          </div>
        )}

        {state.focusAreas.length === 0 && (
          <p className="text-secondary text-sm" style={{ textAlign: 'center', padding: '24px 0' }}>
            Add focus areas first to set targets.
          </p>
        )}

        {tTargets.map(target => {
          const area = state.focusAreas.find(a => a.id === target.focusAreaId);
          if (!area) return null;
          const areaProjects = state.projects.filter(p => p.focusAreaId === area.id && p.status !== 'completed');
          const hasProjects = areaProjects.length > 0;
          const isExpanded = expandedAreas.has(area.id);
          return (
            <div key={area.id} className="tmpl-area-block">
              <div className="tmpl-area-row">
                <div className="allocation-name">
                  <span className="dot" style={{ background: area.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
                  <span>{area.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {hasProjects ? (
                    // Read-only sum derived from project targets
                    <span style={{
                      minWidth: 52,
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: 15,
                      color: 'var(--text)',
                    }}>
                      {target.weeklyTargetHours}h
                    </span>
                  ) : (
                    // Editable when no projects exist
                    <input
                      className="form-input tmpl-hours-input"
                      type="number"
                      value={target.weeklyTargetHours}
                      onChange={e => setAreaHours(area.id, parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.5"
                    />
                  )}
                  <span className="text-secondary" style={{ fontSize: 12, width: 26 }}>h/w</span>
                  {hasProjects && (
                    <button className="tmpl-expand-btn" onClick={() => toggleArea(area.id)}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="tmpl-projects">
                  {areaProjects.map(project => {
                    const pt = target.projectTargets.find(p => p.projectId === project.id);
                    return (
                      <div key={project.id} className="tmpl-project-row">
                        <span className="text-secondary" style={{ fontSize: 13 }}>↳ {project.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            className="form-input tmpl-hours-input"
                            type="number"
                            value={pt?.weeklyTargetHours ?? 0}
                            onChange={e => setProjectHours(area.id, project.id, parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                          />
                          <span className="text-secondary" style={{ fontSize: 12, width: 26 }}>h/w</span>
                          <div style={{ width: 28 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="modal-actions mt-16">
          <button className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!tName.trim() || overLimit}>
            {editingId ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/track')}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Tracking
      </button>

      <div className="section-header">
        <span className="section-title">Week Templates</span>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New</button>
      </div>

      {applied && (
        <div className="tmpl-applied-banner">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <strong>{applied}</strong> applied — targets updated for this week
        </div>
      )}

      {state.weekTemplates.length === 0 && (
        <div className="tmpl-empty">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
          <p>Templates let you define named week types — work weeks, holidays, hiking weekends — each with their own time targets. Apply one every Sunday to plan the week ahead.</p>
          <button className="btn btn-primary" onClick={openNew} style={{ marginTop: 16 }}>Create First Template</button>
        </div>
      )}

      {state.weekTemplates.map(template => {
        const totalHours = template.focusAreaTargets.reduce((s, t) => s + t.weeklyTargetHours, 0);
        const lastUsedText = template.lastUsedAt
          ? `Last applied ${new Date(template.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
          : 'Never applied';
        const activeTargets = template.focusAreaTargets.filter(t => t.weeklyTargetHours > 0);

        return (
          <div key={template.id} className="tmpl-card">
            <div className="tmpl-card-top">
              <div>
                <div className="tmpl-name">{template.name}</div>
                {template.description && (
                  <div className="text-secondary text-sm" style={{ marginTop: 2 }}>{template.description}</div>
                )}
              </div>
              <div className="tmpl-total-hours">{totalHours}h/w</div>
            </div>

            <div className="tmpl-chips">
              {activeTargets.map(target => {
                const area = state.focusAreas.find(a => a.id === target.focusAreaId);
                if (!area) return null;
                const projCount = target.projectTargets.filter(p => p.weeklyTargetHours > 0).length;
                return (
                  <span key={target.focusAreaId} className="tmpl-chip" style={{ borderColor: `${area.color}55`, color: area.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: area.color, display: 'inline-block', flexShrink: 0 }} />
                    {area.name} {target.weeklyTargetHours}h
                    {projCount > 0 && <span style={{ opacity: 0.65, fontSize: 10 }}> +{projCount}p</span>}
                  </span>
                );
              })}
            </div>

            <div className="tmpl-card-footer">
              <span className="text-secondary" style={{ fontSize: 11 }}>{lastUsedText}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  if (window.confirm(`Delete "${template.name}"?`)) {
                    dispatch({ type: 'DELETE_WEEK_TEMPLATE', payload: template.id });
                  }
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(template)}>Edit</button>
                <button className="btn btn-primary btn-sm" onClick={() => setConfirmApplyId(template.id)}>Apply this week</button>
              </div>
            </div>
          </div>
        );
      })}

      {confirmApplyId && (() => {
        const template = state.weekTemplates.find(t => t.id === confirmApplyId)!;
        const totalHours = template.focusAreaTargets.reduce((s, t) => s + t.weeklyTargetHours, 0);
        return (
          <Modal title="Apply Template" onClose={() => setConfirmApplyId(null)}>
            <p className="text-secondary text-sm mb-16">
              Apply <strong style={{ color: 'var(--text)' }}>{template.name}</strong> to this week?
              Weekly targets for all focus areas and realizations will be updated.
            </p>
            <div className="tmpl-apply-preview">
              {template.focusAreaTargets.filter(t => t.weeklyTargetHours > 0).map(target => {
                const area = state.focusAreas.find(a => a.id === target.focusAreaId);
                if (!area) return null;
                return (
                  <div key={target.focusAreaId} className="tmpl-preview-row">
                    <div className="allocation-name" style={{ fontSize: 13 }}>
                      <span className="dot" style={{ background: area.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                      {area.name}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: area.color }}>{target.weeklyTargetHours}h</span>
                  </div>
                );
              })}
              <div className="tmpl-preview-total">
                <span>Total</span>
                <span style={{ fontWeight: 700 }}>{totalHours}h/week</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmApplyId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => applyTemplate(confirmApplyId)}>Apply</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
