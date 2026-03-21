import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, formatDuration, isThisWeek, getWeekStart, formatDate, formatTime } from '../utils';
import type { TimeEntry, FocusArea } from '../types';

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
  const [allocations, setAllocations] = useState<Record<string, number>>({});

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

  const isStaleSession = elapsed > 8 * 3600; // tracking open for more than 8 hours

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

  const openAllocation = () => {
    const alloc: Record<string, number> = {};
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

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalTarget = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours, 0);

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

      <div className="section-header">
        <span className="section-title">Weekly Allocation</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/templates')}
            title="Week Templates" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-5 8v-2h8v2H8zm0-4v-2h8v2H8zm0-4V7h3v2H8z"/>
            </svg>
            Templates
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openAllocation}>Edit</button>
        </div>
      </div>
      {state.focusAreas.map(area => {
        const weekMins = weekEntries
          .filter(e => e.focusAreaId === area.id)
          .reduce((s, e) => s + e.duration, 0);
        const targetMins = area.weeklyTargetHours * 60;
        const pct = targetMins > 0 ? Math.min(100, (weekMins / targetMins) * 100) : 0;
        return (
          <div className="allocation-bar" key={area.id}>
            <div className="allocation-header">
              <div className="allocation-name">
                <span className="dot" style={{ background: area.color }} />
                {area.name}
              </div>
              <span className="allocation-hours">
                {formatDuration(weekMins)} / {area.weeklyTargetHours}h
              </span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: area.color }} />
            </div>
          </div>
        );
      })}
      {totalTarget > 0 && (
        <div className="text-secondary text-sm mt-8">
          Total target: {totalTarget}h/week
        </div>
      )}

      <div className="section-header mt-16">
        <span className="section-title">Today's Log</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowManual(true)}>+ Manual</button>
      </div>
      {todayEntries.map(entry => {
        const area = state.focusAreas.find(a => a.id === entry.focusAreaId);
        const project = entry.projectId ? state.projects.find(p => p.id === entry.projectId) : null;
        return (
          <div className="time-entry" key={entry.id}>
            <div className="time-entry-info">
              <div className="time-entry-area" style={{ color: area?.color }}>
                {area?.name || 'Unknown'}
                {project && <span className="time-entry-project"> / {project.name}</span>}
              </div>
              <div className="time-entry-time">
                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                {entry.note && ` \u2022 ${entry.note}`}
              </div>
            </div>
            <div className="time-entry-duration">{formatDuration(entry.duration)}</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dispatch({ type: 'DELETE_TIME_ENTRY', payload: entry.id })}
            >
              &times;
            </button>
          </div>
        );
      })}
      {todayEntries.length === 0 && (
        <div className="text-secondary text-sm" style={{ textAlign: 'center', padding: 16 }}>
          No time entries today.
        </div>
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

      {showAllocation && (
        <Modal title="Weekly Time Allocation" onClose={() => setShowAllocation(false)}>
          <p className="text-secondary text-sm mb-16">
            Set how many hours per week you want to dedicate to each focus area.
          </p>
          {state.focusAreas.map(area => (
            <div className="form-group" key={area.id}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot" style={{ background: area.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
                {area.name}
              </label>
              <div className="time-input-row">
                <input
                  className="form-input"
                  type="number"
                  value={allocations[area.id] || 0}
                  onChange={e => setAllocations({ ...allocations, [area.id]: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.5"
                />
                <span className="text-secondary">hours/week</span>
              </div>
            </div>
          ))}
          <div className="text-secondary text-sm mt-8">
            Total: {Object.values(allocations).reduce((s, v) => s + v, 0)}h/week
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={saveAllocations}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
