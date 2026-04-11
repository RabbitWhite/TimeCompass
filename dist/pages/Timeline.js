import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useApp } from '../store';
import Modal from '../components/Modal';
import { generateId, formatDate, formatTime, getDaysBetween, isSameDay } from '../utils';
const TIME_WINDOWS = [
    { label: '1 Day', days: 1 },
    { label: '3 Days', days: 3 },
    { label: '1 Week', days: 7 },
    { label: '2 Weeks', days: 14 },
    { label: '1 Month', days: 30 },
];
export default function Timeline() {
    const { state, dispatch } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [showSync, setShowSync] = useState(false);
    const [clientId, setClientId] = useState(state.settings.googleClientId);
    const [eTitle, setETitle] = useState('');
    const [eDesc, setEDesc] = useState('');
    const [eStart, setEStart] = useState('');
    const [eEnd, setEEnd] = useState('');
    const [eArea, setEArea] = useState('');
    const windowDays = state.settings.timeWindowDays;
    const setWindow = (days) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { timeWindowDays: days } });
    };
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + windowDays);
    const days = useMemo(() => getDaysBetween(now, endDate), [windowDays]);
    const eventsByDay = useMemo(() => {
        const filtered = state.calendarEvents
            .filter(e => {
            const d = new Date(e.start);
            return d >= now && d <= endDate;
        })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        return days.map(day => ({
            date: day,
            events: filtered.filter(e => isSameDay(new Date(e.start), day)),
        }));
    }, [state.calendarEvents, windowDays]);
    const openNew = () => {
        const now = new Date();
        const later = new Date(now.getTime() + 3600000);
        setETitle('');
        setEDesc('');
        setEStart(toLocalInput(now));
        setEEnd(toLocalInput(later));
        setEArea('');
        setShowForm(true);
    };
    const saveEvent = () => {
        if (!eTitle.trim() || !eStart || !eEnd)
            return;
        const event = {
            id: generateId(),
            title: eTitle.trim(),
            description: eDesc.trim(),
            start: new Date(eStart).toISOString(),
            end: new Date(eEnd).toISOString(),
            focusAreaId: eArea,
            source: 'manual',
            calendarName: 'Manual',
        };
        dispatch({ type: 'ADD_CALENDAR_EVENT', payload: event });
        setShowForm(false);
    };
    const syncGoogle = async () => {
        if (!clientId.trim())
            return;
        dispatch({ type: 'UPDATE_SETTINGS', payload: { googleClientId: clientId.trim() } });
        try {
            const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
                client_id: clientId.trim(),
                scope: 'https://www.googleapis.com/auth/calendar.readonly',
                callback: async (response) => {
                    if (response.error)
                        return;
                    const token = response.access_token;
                    dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: token, googleCalendarConnected: true } });
                    const timeMin = new Date().toISOString();
                    const timeMax = new Date(Date.now() + windowDays * 86400000).toISOString();
                    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, { headers: { Authorization: `Bearer ${token}` } });
                    if (res.status === 401) {
                        dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: '', googleCalendarConnected: false } });
                        setShowSync(false);
                        alert('Google Calendar session expired — please reconnect.');
                        return;
                    }
                    const data = await res.json();
                    if (data.items) {
                        const events = data.items.map((item) => ({
                            id: `gcal-${item.id}`,
                            title: item.summary || 'Untitled',
                            description: item.description || '',
                            start: item.start?.dateTime || item.start?.date || '',
                            end: item.end?.dateTime || item.end?.date || '',
                            focusAreaId: '',
                            source: 'google',
                            calendarName: 'Google Calendar',
                        }));
                        const manualEvents = state.calendarEvents.filter(e => e.source !== 'google');
                        dispatch({ type: 'SET_CALENDAR_EVENTS', payload: [...manualEvents, ...events] });
                    }
                    setShowSync(false);
                },
            });
            tokenClient?.requestAccessToken();
        }
        catch {
            alert('Google API not loaded. Add the Google Identity Services script to index.html.');
        }
    };
    const today = new Date();
    return (_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsx("span", { className: "section-title", children: "Timeline" }), _jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => setShowSync(true), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", children: _jsx("path", { d: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" }) }), "Sync"] })] }), _jsx("div", { className: "timeline-controls", children: TIME_WINDOWS.map(tw => (_jsx("button", { className: `timeline-chip ${windowDays === tw.days ? 'active' : ''}`, onClick: () => setWindow(tw.days), children: tw.label }, tw.days))) }), state.settings.googleCalendarConnected && (_jsxs("div", { className: "sync-banner", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", fill: "var(--success)", children: _jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }) }), _jsx("p", { children: "Google Calendar connected" }), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => dispatch({ type: 'UPDATE_SETTINGS', payload: { googleCalendarConnected: false, googleAccessToken: '' } }), children: "Disconnect" })] })), eventsByDay.map(({ date, events }) => {
                const isToday = isSameDay(date, today);
                if (events.length === 0 && !isToday)
                    return null;
                return (_jsxs("div", { className: "day-group", children: [_jsx("div", { className: "day-label", style: isToday ? { color: 'var(--primary)' } : {}, children: isToday ? 'Today' : formatDate(date.toISOString()) }), events.length === 0 && (_jsx("div", { className: "text-secondary text-sm", style: { padding: '8px 4px' }, children: "No events scheduled" })), events.map(event => {
                            const linkedArea = state.focusAreas.find(a => a.id === event.focusAreaId);
                            return (_jsxs("div", { className: "event-card", children: [_jsx("span", { className: "event-time", children: formatTime(event.start) }), _jsx("span", { className: "event-dot", style: { background: linkedArea?.color || (event.source === 'google' ? '#4285f4' : 'var(--text-muted)') } }), _jsxs("div", { className: "event-info", children: [_jsx("div", { className: "event-title truncate", children: event.title }), _jsxs("div", { className: "event-desc", children: [formatTime(event.start), " - ", formatTime(event.end), linkedArea && ` \u2022 ${linkedArea.name}`, event.source === 'google' && ' \u2022 Google'] })] }), event.source === 'manual' && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => dispatch({ type: 'DELETE_CALENDAR_EVENT', payload: event.id }), children: "\u00D7" }))] }, event.id));
                        })] }, date.toISOString()));
            }), state.calendarEvents.length === 0 && (_jsxs("div", { className: "empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", children: _jsx("path", { d: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" }) }), _jsxs("p", { children: ["No upcoming events.", _jsx("br", {}), "Add events manually or sync with Google Calendar."] })] })), _jsx("button", { className: "fab", onClick: openNew, children: "+" }), showForm && (_jsxs(Modal, { title: "Add Event", onClose: () => setShowForm(false), children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Title" }), _jsx("input", { className: "form-input", value: eTitle, onChange: e => setETitle(e.target.value), placeholder: "Event name", autoFocus: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-textarea", value: eDesc, onChange: e => setEDesc(e.target.value), rows: 2 })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Start" }), _jsx("input", { className: "form-input", type: "datetime-local", value: eStart, onChange: e => setEStart(e.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "End" }), _jsx("input", { className: "form-input", type: "datetime-local", value: eEnd, onChange: e => setEEnd(e.target.value) })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Link to Focus Area" }), _jsxs("select", { className: "form-select", value: eArea, onChange: e => setEArea(e.target.value), children: [_jsx("option", { value: "", children: "None" }), state.focusAreas.map(a => (_jsx("option", { value: a.id, children: a.name }, a.id)))] })] }), _jsx("div", { className: "modal-actions", children: _jsx("button", { className: "btn btn-primary", onClick: saveEvent, children: "Add Event" }) })] })), showSync && (_jsxs(Modal, { title: "Google Calendar Sync", onClose: () => setShowSync(false), children: [_jsx("p", { className: "text-secondary text-sm mb-16", children: "To sync with Google Calendar, you need a Google Cloud API Client ID with the Calendar API enabled. Enter it below and authorize access." }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Google API Client ID" }), _jsx("input", { className: "form-input", value: clientId, onChange: e => setClientId(e.target.value), placeholder: "xxxx.apps.googleusercontent.com" })] }), _jsxs("p", { className: "text-secondary text-sm mb-16", children: ["Add this script to your index.html for Google sign-in:", _jsx("br", {}), _jsx("code", { style: { fontSize: 11, color: 'var(--primary)' }, children: '<script src="https://accounts.google.com/gsi/client" async defer></script>' })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowSync(false), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: syncGoogle, children: "Connect" })] })] }))] }));
}
function toLocalInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}
