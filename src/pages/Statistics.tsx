import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store';
import { formatDuration, getWeekStart, getWeekEnd, getDaysBetween, isSameDay, formatDate,
  calculateWeeklyScore, getPeriodIndex, getPeriodDateRange, getWeekWithinPeriod,
  computeMaxWeekPoints, pointsToEuros, formatEuros, getCatchUpAreas } from '../utils';
import type { TimeEntry } from '../types';

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_30';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
];

export default function Statistics() {
  const { state } = useApp();
  const [period, setPeriod] = useState<Period>('this_week');
  const [filterArea, setFilterArea] = useState('');
  const gamSettings = state.settings.gamification;

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this_week':
        return { startDate: getWeekStart(now), endDate: getWeekEnd(now) };
      case 'last_week': {
        const prev = new Date(now);
        prev.setDate(prev.getDate() - 7);
        return { startDate: getWeekStart(prev), endDate: getWeekEnd(prev) };
      }
      case 'this_month': {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { startDate: s, endDate: e };
      }
      case 'last_30': {
        const s = new Date(now);
        s.setDate(s.getDate() - 30);
        s.setHours(0, 0, 0, 0);
        return { startDate: s, endDate: now };
      }
    }
  }, [period]);

  const entries = useMemo(() => {
    return state.timeEntries.filter(e => {
      const d = new Date(e.startTime);
      if (d < startDate || d > endDate) return false;
      if (filterArea && e.focusAreaId !== filterArea) return false;
      return true;
    });
  }, [state.timeEntries, startDate, endDate, filterArea]);

  // Per-area breakdown — sorted by lowest current-period completion first
  const areaBreakdown = useMemo(() => {
    const catchUpOrder = getCatchUpAreas(
      state.focusAreas,
      state.timeEntries,
      gamSettings,
      state.focusAreas.length,
      state.settings.periodResetDate,
    );
    const rankMap = new Map(catchUpOrder.map(({ area }, i) => [area.id, i]));
    const map = new Map<string, number>();
    entries.forEach(e => {
      map.set(e.focusAreaId, (map.get(e.focusAreaId) || 0) + e.duration);
    });
    return state.focusAreas
      .map(area => ({ area, minutes: map.get(area.id) || 0 }))
      .filter(a => a.minutes > 0 || !filterArea)
      .sort((a, b) => (rankMap.get(a.area.id) ?? 999) - (rankMap.get(b.area.id) ?? 999));
  }, [entries, state.focusAreas, state.timeEntries, gamSettings, filterArea]);

  // Daily breakdown for bar chart
  const dailyData = useMemo(() => {
    const days = getDaysBetween(startDate, endDate);
    return days.map(day => {
      const dayEntries = entries.filter(e => isSameDay(new Date(e.startTime), day));
      const total = dayEntries.reduce((s, e) => s + e.duration, 0);
      return { date: day, total };
    });
  }, [entries, startDate, endDate]);

  const maxDaily = Math.max(1, ...dailyData.map(d => d.total));

  const exportCSV = useCallback(() => {
    const csvEscape = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Duration (hours)', 'Focus Area', 'Realization', 'Note'];
    const rows = entries
      .sort((a: TimeEntry, b: TimeEntry) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((e: TimeEntry) => {
        const area = state.focusAreas.find(a => a.id === e.focusAreaId);
        const project = e.projectId ? state.projects.find(p => p.id === e.projectId) : null;
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        return [
          start.toISOString().split('T')[0],
          start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          String(e.duration),
          (e.duration / 60).toFixed(2),
          area?.name || 'Unknown',
          project?.name || '',
          e.note || '',
        ].map(csvEscape).join(',');
      });

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timecompass-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [entries, state.focusAreas, state.projects, period]);

  // Pie chart data
  const pieData = areaBreakdown.filter(a => a.minutes > 0);
  const pieTotal = Math.max(1, pieData.reduce((s, a) => s + a.minutes, 0));

  // Gamification historical data (moved from Gamification.tsx)
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const previousStreak = useMemo(() => {
    const prevScores = state.weeklyScores
      .filter(s => new Date(s.weekStart) < currentWeekStart)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    let streak = 0;
    for (const s of prevScores) {
      if (s.areaScores.length > 0 && s.areaScores.every(a => a.completionRate >= 1)) streak++;
      else break;
    }
    return streak;
  }, [state.weeklyScores]);
  const currentScore = useMemo(() =>
    calculateWeeklyScore(state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak),
    [state.focusAreas, state.timeEntries, gamSettings, currentWeekStart, previousStreak],
  );
  const currentPeriodIdx = getPeriodIndex(currentWeekStart);
  const maxWeekPts = useMemo(
    () => computeMaxWeekPoints(state.focusAreas, gamSettings),
    [state.focusAreas, gamSettings],
  );
  const currentPeriodPoints = useMemo(() => {
    const past = state.weeklyScores
      .filter(s => {
        const wStart = new Date(s.weekStart);
        return getPeriodIndex(wStart) === currentPeriodIdx
          && wStart.getTime() !== currentWeekStart.getTime();
      })
      .reduce((s, sc) => s + sc.totalPoints, 0);
    return past + currentScore.totalPoints;
  }, [state.weeklyScores, currentScore, currentPeriodIdx]);
  const budget = gamSettings.monthlyRewardBudget;
  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const pastPeriods = useMemo(() => {
    const byPeriod = new Map<number, number>();
    for (const s of state.weeklyScores) {
      const idx = getPeriodIndex(new Date(s.weekStart));
      if (idx >= currentPeriodIdx) continue;
      byPeriod.set(idx, (byPeriod.get(idx) ?? 0) + s.totalPoints);
    }
    return [...byPeriod.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .map(([idx, pts]) => {
        const { start, end } = getPeriodDateRange(idx);
        const euros = pointsToEuros(pts, maxWeekPts, budget);
        const pct = maxWeekPts > 0 ? Math.min(1, pts / (maxWeekPts * 4)) : 0;
        return { idx, pts, euros, pct, start, end };
      });
  }, [state.weeklyScores, currentPeriodIdx, maxWeekPts, budget]);
  const totalAcquiredEuros = pastPeriods.reduce((s, p) => s + p.euros, 0);

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Statistics</span>
        {entries.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      <div className="timeline-controls">
        {PERIODS.map(p => (
          <button
            key={p.value}
            className={`timeline-chip ${period === p.value ? 'active' : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {state.focusAreas.length > 1 && (
        <div className="form-group">
          <select
            className="form-select"
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            style={{ fontSize: 13, padding: 8 }}
          >
            <option value="">All Focus Areas</option>
            {state.focusAreas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Time Distribution</div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <svg width="160" height="160" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
              {(() => {
                let cumulative = 0;
                return pieData.map(({ area, minutes }) => {
                  const pct = minutes / pieTotal;
                  const startAngle = cumulative * 2 * Math.PI;
                  cumulative += pct;
                  const endAngle = cumulative * 2 * Math.PI;
                  const largeArc = pct > 0.5 ? 1 : 0;
                  const x1 = Math.cos(startAngle);
                  const y1 = Math.sin(startAngle);
                  const x2 = Math.cos(endAngle);
                  const y2 = Math.sin(endAngle);
                  if (pieData.length === 1) {
                    return <circle key={area.id} r="1" fill={area.color} />;
                  }
                  return (
                    <path
                      key={area.id}
                      d={`M ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} L 0 0`}
                      fill={area.color}
                    />
                  );
                });
              })()}
            </svg>
          </div>
          <div className="chart-legend">
            {pieData.map(({ area, minutes }) => (
              <div className="legend-item" key={area.id}>
                <span className="legend-dot" style={{ background: area.color }} />
                {area.name} ({Math.round((minutes / pieTotal) * 100)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actual vs Target comparison */}
      {(period === 'this_week' || period === 'last_week') && areaBreakdown.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Actual vs Target</div>
          {areaBreakdown.map(({ area, minutes }) => {
            const targetMins = area.weeklyTargetHours * 60;
            const maxMins = Math.max(targetMins, minutes, 1);
            return (
              <div className="comparison-row" key={area.id}>
                <div className="comparison-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="legend-dot" style={{ background: area.color }} />
                    {area.name}
                  </span>
                  <span className="text-secondary">
                    {formatDuration(minutes)} / {area.weeklyTargetHours}h
                  </span>
                </div>
                <div className="comparison-bars">
                  <div
                    className="comparison-bar"
                    style={{
                      width: `${(minutes / maxMins) * 100}%`,
                      background: area.color,
                      minWidth: minutes > 0 ? 4 : 0,
                    }}
                  />
                  <div
                    className="comparison-bar"
                    style={{
                      width: `${(targetMins / maxMins) * 100}%`,
                      background: `${area.color}40`,
                      minWidth: targetMins > 0 ? 4 : 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div className="chart-legend mt-8">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--primary)' }} /> Actual
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--primary)', opacity: 0.25 }} /> Target
            </div>
          </div>
        </div>
      )}

      {/* Daily Bar Chart */}
      {dailyData.length > 0 && dailyData.some(d => d.total > 0) && (
        <div className="chart-container">
          <div className="chart-title">Daily Activity</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, padding: '8px 0' }}>
            {dailyData.map(({ date, total }) => {
              const maxBarPx = 90;
              const barPx = maxDaily > 0 ? Math.round((total / maxDaily) * maxBarPx) : 0;
              const finalPx = total > 0 ? Math.max(barPx, 4) : 0;
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={date.toISOString()}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 4,
                    height: maxBarPx + 20,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: finalPx,
                      background: isToday ? 'var(--primary)' : 'rgba(108, 99, 255, 0.35)',
                      borderRadius: 3,
                      transition: 'height 0.3s',
                    }}
                    title={`${formatDate(date.toISOString())}: ${formatDuration(total)}`}
                  />
                  <span style={{ fontSize: 9, color: isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {date.toLocaleDateString('en', { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gamification historical content (moved from Gamification.tsx) */}
      {gamSettings.enabled && (
        <>
          <div className="section-header mt-16">
            <span className="section-title">This Week</span>
            {budget > 0 && maxWeekPts > 0 && (
              <span className="text-secondary text-sm">
                ~€{formatEuros(pointsToEuros(currentScore.totalPoints, maxWeekPts, budget / 4))} so far
              </span>
            )}
          </div>
          <div className="score-card">
            <div className="score-breakdown">
              <div className="score-row">
                <div className="score-row-label">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--success)">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Achievement
                </div>
                <span className="score-row-value">{currentScore.achievementPoints} pts</span>
              </div>
              <div className="score-row">
                <div className="score-row-label">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
                  </svg>
                  Balance ({Math.round(currentScore.balanceRatio * 100)}%)
                </div>
                <span className="score-row-value">{currentScore.balancePoints} pts</span>
              </div>
              <div className="score-row">
                <div className="score-row-label">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--warning)">
                    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51L12.96 17.55 11 21z" />
                  </svg>
                  Streak ({currentScore.streakWeeks}w)
                </div>
                <span className="score-row-value">{currentScore.streakBonus} pts</span>
              </div>
              <div className="score-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
                <div className="score-row-label" style={{ fontWeight: 600 }}>Total</div>
                <span className="score-row-value" style={{ fontWeight: 700 }}>{currentScore.totalPoints} pts</span>
              </div>
            </div>
          </div>

          {pastPeriods.length > 0 && (
            <>
              <div className="section-header mt-16">
                <span className="section-title">Past Periods</span>
                {budget > 0 && (
                  <span className="text-secondary text-sm">Total: €{formatEuros(totalAcquiredEuros)}</span>
                )}
              </div>
              {pastPeriods.map(p => (
                <div className="time-entry" key={p.idx}>
                  <div className="time-entry-info">
                    <div className="time-entry-area">{fmtDate(p.start)} – {fmtDate(p.end)}</div>
                    <div className="time-entry-time">
                      {Math.round(p.pts)} pts
                      {maxWeekPts > 0 && <> • {Math.round(p.pct * 100)}% of max</>}
                    </div>
                  </div>
                  {budget > 0 ? (
                    <div style={{ fontWeight: 700, color: p.pct >= 1 ? 'var(--success)' : 'var(--text)' }}>
                      €{formatEuros(p.euros)}
                    </div>
                  ) : (
                    <div className="time-entry-duration">{Math.round(p.pts)} pts</div>
                  )}
                </div>
              ))}
            </>
          )}

          {state.weeklyScores.length > 1 && (
            <>
              <div className="section-header mt-16">
                <span className="section-title">Weekly History</span>
              </div>
              <div className="history-chart">
                {state.weeklyScores
                  .slice()
                  .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
                  .slice(-8)
                  .map(score => {
                    const isCurrent = new Date(score.weekStart).getTime() === currentWeekStart.getTime();
                    const maxPts = Math.max(1, ...state.weeklyScores.map(s => s.totalPoints));
                    const barPx = maxPts > 0 ? Math.round((score.totalPoints / maxPts) * 72) : 0;
                    const finalPx = score.totalPoints > 0 ? Math.max(barPx, 4) : 0;
                    return (
                      <div className="history-bar-wrap" key={score.weekStart}>
                        <div className="history-bar-container" style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div
                            className="history-bar"
                            style={{
                              height: finalPx,
                              background: isCurrent ? 'var(--primary)' : 'rgba(108, 99, 255, 0.35)',
                            }}
                          />
                        </div>
                        <span className="history-label">
                          {new Date(score.weekStart).toLocaleDateString('en', { month: 'narrow', day: 'numeric' })}
                        </span>
                        {budget > 0 && maxWeekPts > 0 ? (
                          <span className="history-pts" style={{ fontSize: 11 }}>
                            €{formatEuros(pointsToEuros(score.totalPoints, maxWeekPts, budget / 4))}
                          </span>
                        ) : (
                          <span className="history-pts">{Math.round(score.totalPoints)}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </>
      )}

      {entries.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
          <p>No data for this period yet.<br />Start tracking time to see statistics.</p>
        </div>
      )}
    </div>
  );
}
