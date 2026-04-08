import { useState, useEffect } from 'react';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, formatDuration, getCatchUpAreas } from '../utils';
import type { TimeEntry, FocusArea } from '../types';

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
    if (!state.activeTracking) { setElapsed(0); return; }
    const tick = () => {
      const start = new Date(state.activeTracking!.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.activeTracking]);

  const activeArea = state.activeTracking
    ? state.focusAreas.find(a => a.id === state.activeTracking!.focusAreaId)
    : null;

  const isStaleSession = elapsed > 8 * 3600;

  const startTracking = (areaId: string) => {
    if (state.activeTracking) stopTracking();
    dispatch({
      type: 'START_TRACKING',
      payload: { focusAreaId: areaId, projectId: '', startTime: new Date().toISOString() },
    });
  };

  const stopTracking = () => {
    if (!state.activeTracking) return;
    const start = state.activeTracking.startTime;
    const end = new Date().toISOString();
    const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (duration > 0) {
      const entry: TimeEntry = {
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
    if (!mArea || !mDate || !mStart || !mEnd) return;
    const startTime = new Date(`${mDate}T${mStart}`).toISOString();
    const endTime = new Date(`${mDate}T${mEnd}`).toISOString();
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    if (duration <= 0) return;
    const entry: TimeEntry = {
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

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const catchUpAreas = getCatchUpAreas(
    state.focusAreas,
    state.timeEntries,
    state.settings.gamification,
    state.focusAreas.length,
    state.settings.periodResetDate,
  );

  return (
    <div>
      {state.activeTracking && activeArea ? (
        <div className="tracker-banner" style={{ background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }}>
          <div className="tracking-label">Tracking</div>
          <div className="tracking-area">{activeArea.name}</div>
          {state.projects.filter(p => p.focusAreaId === activeArea.id).length > 0 && (
            <select
              className="tracking-project-select"
              value={state.activeTracking.projectId}
              onChange={e => dispatch({
                type: 'START_TRACKING',
                payload: { ...state.activeTracking!, projectId: e.target.value },
              })}
            >
              <option value="">No realization</option>
              {state.projects
                .filter(p => p.focusAreaId === activeArea.id)
                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="tracking-time">{formatElapsed(elapsed)}</div>
          {isStaleSession && (
            <div className="tracking-stale-warning">
              Session running for a long time — did you forget to stop?
            </div>
          )}
          <button className="btn" onClick={stopTracking}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 6h12v12H6z" />
            </svg>
            Stop
          </button>
        </div>
      ) : (
        <div className="tracker-banner">
          <div className="tracking-label">Ready to track</div>
          <div className="tracking-area" style={{ fontSize: 16, opacity: 0.8 }}>Select a focus area below to start</div>
        </div>
      )}

      <div className="section-header">
        <span className="section-title">Quick Start</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(true)}>+ Manual</button>
      </div>
      <div className="quick-buttons">
        {state.focusAreas.map(area => (
          <button
            key={area.id}
            className="quick-btn"
            onClick={() => startTracking(area.id)}
            style={state.activeTracking?.focusAreaId === area.id ? { borderColor: area.color, background: `${area.color}15` } : {}}
          >
            <span className="area-dot" style={{ background: area.color }} />
            <span className="truncate">{area.name}</span>
          </button>
        ))}
      </div>

      {state.focusAreas.length === 0 && (
        <div className="text-secondary text-sm" style={{ textAlign: 'center', padding: 16 }}>
          Add focus areas first to start tracking.
        </div>
      )}

      {state.focusAreas.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Focus Areas</span>
          </div>
          {catchUpAreas.map(({ area, gapMinutes, totalMinutes, urgency }) => (
            <div className="allocation-bar" key={area.id}>
              <div className="allocation-header">
                <div className="allocation-name">
                  <span className="dot" style={{ background: area.color }} />
                  {area.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="allocation-hours">{formatDuration(totalMinutes)} done</span>
                  {gapMinutes > 0 && (
                    <span className="allocation-hours">{formatDuration(gapMinutes)} behind</span>
                  )}
                  <span style={{
                    color: urgency === 0 ? 'var(--success)' : urgency === 1 ? 'var(--text-muted)' : urgency === 2 ? 'var(--warning)' : 'var(--error)',
                    fontWeight: 600,
                  }}>
                    {urgency === 0 ? '✓' : urgency === 1 ? '!' : urgency === 2 ? '!!' : '!!!'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {showManual && (
        <Modal title="Manual Time Entry" onClose={() => setShowManual(false)}>
          <div className="form-group">
            <label className="form-label">Focus Area</label>
            <select className="form-select" value={mArea} onChange={e => { setMArea(e.target.value); setMProject(''); }}>
              <option value="">Select area...</option>
              {state.focusAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {mArea && (
            <div className="form-group">
              <label className="form-label">Realization (optional)</label>
              <select className="form-select" value={mProject} onChange={e => setMProject(e.target.value)}>
                <option value="">None</option>
                {state.projects.filter(p => p.focusAreaId === mArea).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={mDate} onChange={e => setMDate(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={mStart} onChange={e => setMStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={mEnd} onChange={e => setMEnd(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <input className="form-input" value={mNote} onChange={e => setMNote(e.target.value)} placeholder="What did you work on?" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={saveManual}>Save Entry</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
