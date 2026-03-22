import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { formatDuration, isThisWeek, getWeekStart, formatTime, formatDate, calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros } from '../utils';

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

  // Gamification
  const gamSettings = state.settings.gamification;
  const currentWeekStart = getWeekStart();
  const previousStreak = useMemo(() => {
    const prevScores = state.weeklyScores
      .filter(s => new Date(s.weekStart) < currentWeekStart)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    let streak = 0;
    for (const s of prevScores) {
      if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1)) {
        streak++;
      } else break;
    }
    return streak;
  }, [state.weeklyScores]);

  const currentScore = useMemo(() => {
    return calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak);
  }, [state.focusAreas, state.timeEntries, gamSettings, previousStreak]);

  // Period reward calculation
  const currentPeriodIdx = getPeriodIndex(currentWeekStart);
  const maxWeekPts = computeMaxWeekPoints(state.focusAreas, gamSettings);
  const currentPeriodPoints = state.weeklyScores
    .filter(s => {
      const wStart = new Date(s.weekStart);
      return getPeriodIndex(wStart) === currentPeriodIdx
        && wStart.getTime() !== currentWeekStart.getTime();
    })
    .reduce((s, sc) => s + sc.totalPoints, 0) + currentScore.totalPoints;
  const currentPeriodEuros = pointsToEuros(currentPeriodPoints, maxWeekPts, gamSettings.monthlyRewardBudget);
  const { start: periodStart } = getPeriodDateRange(currentPeriodIdx);
  const budget = gamSettings.monthlyRewardBudget;

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

      {gamSettings.enabled && (
        <div className="dash-points-card" onClick={() => navigate('/gamification')}>
          <div className="dash-points-left">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--warning)">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 17.9V20H7v2h10v-2h-4v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
            <div>
              <div className="dash-points-level">Monthly Reward</div>
              <div className="dash-points-total">
                {budget > 0
                  ? `Period from ${periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : `${Math.round(currentScore.totalPoints)} pts this week`}
              </div>
            </div>
          </div>
          <div className="dash-points-right">
            {budget > 0 ? (
              <>
                <div className="dash-points-week">€{formatEuros(currentPeriodEuros)}</div>
                <div className="dash-points-label">of €{formatEuros(budget)}</div>
              </>
            ) : (
              <>
                <div className="dash-points-week">{Math.round(currentScore.totalPoints)}</div>
                <div className="dash-points-label">pts this week</div>
              </>
            )}
          </div>
        </div>
      )}

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
