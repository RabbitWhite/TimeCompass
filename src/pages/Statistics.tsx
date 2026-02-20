import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store';
import { formatDuration, getWeekStart, getWeekEnd, getDaysBetween, isSameDay, formatDate } from '../utils';
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

  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
  const entryCount = entries.length;
  const avgPerDay = (() => {
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    return totalMinutes / days;
  })();

  // Per-area breakdown
  const areaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      map.set(e.focusAreaId, (map.get(e.focusAreaId) || 0) + e.duration);
    });
    return state.focusAreas
      .map(area => ({ area, minutes: map.get(area.id) || 0 }))
      .filter(a => a.minutes > 0 || !filterArea)
      .sort((a, b) => b.minutes - a.minutes);
  }, [entries, state.focusAreas, filterArea]);

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
    link.download = `lifetracker-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [entries, state.focusAreas, state.projects, period]);

  // Pie chart data
  const pieData = areaBreakdown.filter(a => a.minutes > 0);
  const pieTotal = Math.max(1, pieData.reduce((s, a) => s + a.minutes, 0));

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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalMinutes)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{entryCount}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(Math.round(avgPerDay))}</div>
          <div className="stat-label">Avg/Day</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{entryCount > 0 ? formatDuration(Math.round(totalMinutes / entryCount)) : '0m'}</div>
          <div className="stat-label">Avg Session</div>
        </div>
      </div>

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
              const height = maxDaily > 0 ? (total / maxDaily) * 100 : 0;
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={date.toISOString()}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${Math.max(height, total > 0 ? 4 : 0)}%`,
                      background: isToday ? 'var(--primary)' : 'var(--surface-elevated)',
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

      {entries.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
          <p>No data for this period yet.<br />Start tracking time to see statistics.</p>
        </div>
      )}
    </div>
  );
}
