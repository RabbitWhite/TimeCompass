export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
export function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
export function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
export function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0)
        return `${m}m`;
    if (m === 0)
        return `${h}h`;
    return `${h}h ${m}m`;
}
export function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}
export function getWeekEnd(date = new Date()) {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}
export function isThisWeek(dateStr) {
    const date = new Date(dateStr);
    const start = getWeekStart();
    const end = getWeekEnd();
    return date >= start && date <= end;
}
export function getDaysBetween(start, end) {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}
export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}
export function minutesBetween(start, end) {
    return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}
/**
 * Calculate the weekly gamification score.
 *
 * Scoring philosophy:
 * - Achievement: each area earns points proportional to min(1, actual/target).
 *   No extra credit for exceeding a single area's target.
 * - Balance: measures how uniformly all areas track toward their targets.
 *   Uses 1 - 2*stddev of completion rates, scaled by the average completion.
 *   Over-investing in one area while neglecting others yields a low balance score.
 * - Streak: consecutive weeks where every area reaches its target earn a bonus.
 */
export function calculateWeeklyScore(focusAreas, timeEntries, settings, weekStartDate, previousStreakWeeks) {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const areasWithTargets = focusAreas.filter(a => a.weeklyTargetHours > 0);
    const areaScores = areasWithTargets.map(area => {
        const areaMinutes = timeEntries
            .filter(e => {
            const d = new Date(e.startTime);
            return e.focusAreaId === area.id && d >= weekStartDate && d <= weekEnd;
        })
            .reduce((s, e) => s + e.duration, 0);
        const actualHours = areaMinutes / 60;
        const completionRate = area.weeklyTargetHours > 0
            ? Math.min(1, actualHours / area.weeklyTargetHours)
            : 0;
        const pointsEarned = completionRate * settings.pointsPerTargetHour * area.weeklyTargetHours;
        return {
            focusAreaId: area.id,
            targetHours: area.weeklyTargetHours,
            actualHours: Math.round(actualHours * 100) / 100,
            completionRate,
            pointsEarned: Math.round(pointsEarned * 10) / 10,
        };
    });
    const achievementPoints = areaScores.reduce((s, a) => s + a.pointsEarned, 0);
    // Balance calculation
    let balanceRatio = 0;
    let balancePoints = 0;
    if (areaScores.length > 1) {
        const rates = areaScores.map(a => a.completionRate);
        const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
        const variance = rates.reduce((s, r) => s + (r - avg) ** 2, 0) / rates.length;
        const stddev = Math.sqrt(variance);
        // Max possible stddev for [0,1] values is 0.5, so scale accordingly
        balanceRatio = Math.max(0, 1 - 2 * stddev);
        // Scale balance points by average completion so doing nothing = 0 balance points
        balancePoints = balanceRatio * avg * settings.balanceBasePoints * areaScores.length;
    }
    else if (areaScores.length === 1) {
        // Single area: balance is trivially perfect, scale by completion
        balanceRatio = 1;
        balancePoints = areaScores[0].completionRate * settings.balanceBasePoints;
    }
    balancePoints = Math.round(balancePoints * 10) / 10;
    // Streak: all areas must reach >= 100% completion
    const allTargetsMet = areaScores.length > 0 && areaScores.every(a => a.completionRate >= 1);
    const streakWeeks = allTargetsMet ? previousStreakWeeks + 1 : 0;
    const streakBonus = streakWeeks > 0
        ? Math.round(streakWeeks * settings.streakBonusPoints * 10) / 10
        : 0;
    const totalPoints = Math.round((achievementPoints + balancePoints + streakBonus) * 10) / 10;
    return {
        weekStart: weekStartDate.toISOString(),
        achievementPoints: Math.round(achievementPoints * 10) / 10,
        balancePoints,
        streakBonus,
        totalPoints,
        areaScores,
        balanceRatio: Math.round(balanceRatio * 100) / 100,
        streakWeeks,
    };
}
export function getWeekLabel(weekStartISO) {
    const d = new Date(weekStartISO);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const fmt = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(d)} - ${fmt(end)}`;
}
export function getLevelFromPoints(totalPoints) {
    const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000];
    const titles = [
        'Beginner', 'Apprentice', 'Journeyman', 'Adept',
        'Expert', 'Master', 'Grandmaster', 'Legend',
        'Mythic', 'Transcendent', 'Ascended',
    ];
    let level = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (totalPoints >= thresholds[i]) {
            level = i;
            break;
        }
    }
    const current = thresholds[level];
    const next = level < thresholds.length - 1 ? thresholds[level + 1] : thresholds[level] + 1000;
    const progress = (totalPoints - current) / (next - current);
    return { level, title: titles[level], nextThreshold: next, progress: Math.min(1, progress) };
}
export function getIconSvg(icon) {
    const icons = {
        code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
        camera: 'M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4zm9-8.6h-3.17L16.4 5H7.6L6.17 6.6H3A1.4 1.4 0 0 0 1.6 8v10A1.4 1.4 0 0 0 3 19.4h18a1.4 1.4 0 0 0 1.4-1.4V8A1.4 1.4 0 0 0 21 6.6z',
        book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
        music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
        brush: 'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z',
        fitness: 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
        science: 'M13 11.33L18 18H6l5-6.67V6h2v5.33M15.96 4H8.04c-.42 0-.65.48-.39.81L9 6.5v4.17L3.2 18.4c-.49.66-.02 1.6.8 1.6h16c.82 0 1.29-.94.8-1.6L15 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81z',
        travel: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
        food: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
        film: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
        game: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
        chat: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
        heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        bolt: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
        globe: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
    };
    return icons[icon] || icons.star;
}
