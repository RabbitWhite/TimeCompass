import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { formatDuration, isThisWeek, getWeekStart, formatTime, formatDate } from '../utils';
import type { TimeEntry, CalendarEvent } from '../types';

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!state.activeTracking) return;
    const tick = () => {
      const start = new Date(state.activeTracking!.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 60000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.activeTracking]);

  const weekEntries = state.timeEntries.filter(e => isThisWeek(e.startTime));
  const totalMinutes = weekEntries.reduce((s, e) => s + e.duration, 0);
  const todayEntries = weekEntries.filter(e => {
    const d = new Date(e.startTime);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayMinutes = todayEntries.reduce((s, e) => s + e.duration, 0);
  const totalTarget = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours, 0);

  const activeArea = state.activeTracking
    ? state.focusAreas.find(a => a.id === state.activeTracking!.focusAreaId)
    : null;

  const upcomingEvents = state.calendarEvents
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);

  const areaHours = state.focusAreas.map(area => {
    const mins = weekEntries
      .filter(e => e.focusAreaId === area.id)
      .reduce((s, e) => s + e.duration, 0);
    return { area, mins, target: area.weeklyTargetHours * 60 };
  });

  return (
    <div>
      <div className="dash-welcome">
        <h2>LifeTracker</h2>
        <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {state.activeTracking && activeArea && (
        <div className="tracker-banner" style={{ background: `linear-gradient(135deg, ${activeArea.color}, ${activeArea.color}99)` }}>
          <div className="tracking-label">Currently tracking</div>
          <div className="tracking-area">{activeArea.name}</div>
          <div className="tracking-time">{formatDuration(elapsed)}</div>
          <button className="btn btn-sm" onClick={() => navigate('/track')}>
            View Tracker
          </button>
        </div>
      )}

      <div className="dash-summary">
        <div className="dash-stat">
          <div className="value">{formatDuration(todayMinutes)}</div>
          <div className="label">Today</div>
        </div>
        <div className="dash-stat">
          <div className="value">{formatDuration(totalMinutes)}</div>
          <div className="label">This Week</div>
        </div>
        <div className="dash-stat">
          <div className="value">{totalTarget}h</div>
          <div className="label">Target</div>
        </div>
      </div>

      {areaHours.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">Weekly Progress</span>
          </div>
          {areaHours.map(({ area, mins, target }) => (
            <div className="allocation-bar" key={area.id}>
              <div className="allocation-header">
                <div className="allocation-name">
                  <span className="dot" style={{ background: area.color }} />
                  {area.name}
                </div>
                <span className="allocation-hours">
                  {formatDuration(mins)} / {area.weeklyTargetHours}h
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(100, target > 0 ? (mins / target) * 100 : 0)}%`,
                    background: area.color,
                  }}
                />
                {target > 0 && (
                  <div className="bar-target" style={{ left: '100%' }} />
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {upcomingEvents.length > 0 && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">Upcoming</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/timeline')}>View all</button>
          </div>
          {upcomingEvents.map(event => {
            const linkedArea = state.focusAreas.find(a => a.id === event.focusAreaId);
            return (
              <div className="event-card" key={event.id}>
                <span className="event-time">{formatTime(event.start)}</span>
                <span
                  className="event-dot"
                  style={{ background: linkedArea?.color || 'var(--text-muted)' }}
                />
                <div className="event-info">
                  <div className="event-title truncate">{event.title}</div>
                  <div className="event-desc">
                    {formatDate(event.start)}
                    {linkedArea && ` \u2022 ${linkedArea.name}`}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {state.focusAreas.length === 0 && !state.activeTracking && (
        <div className="empty-state mt-16">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          <p>Welcome to LifeTracker!<br />Start by adding your first focus area.</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/areas')}>
            Add Focus Area
          </button>
        </div>
      )}
    </div>
  );
}
