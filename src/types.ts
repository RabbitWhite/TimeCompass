export interface FocusArea {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  weeklyTargetHours: number;
  createdAt: string;
}

export interface Project {
  id: string;
  focusAreaId: string;
  name: string;
  description: string;
  githubUrl: string;
  trelloUrl: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  focusAreaId: string;
  projectId: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  note: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  focusAreaId: string;
  source: 'google' | 'manual';
  calendarName: string;
}

export interface ActiveTracking {
  focusAreaId: string;
  projectId: string;
  startTime: string;
}

export interface AppSettings {
  timeWindowDays: number;
  googleCalendarConnected: boolean;
  googleAccessToken: string;
  googleClientId: string;
}

export interface AppState {
  focusAreas: FocusArea[];
  projects: Project[];
  timeEntries: TimeEntry[];
  calendarEvents: CalendarEvent[];
  activeTracking: ActiveTracking | null;
  settings: AppSettings;
}

export type AppAction =
  | { type: 'ADD_FOCUS_AREA'; payload: FocusArea }
  | { type: 'UPDATE_FOCUS_AREA'; payload: FocusArea }
  | { type: 'DELETE_FOCUS_AREA'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_TIME_ENTRY'; payload: TimeEntry }
  | { type: 'UPDATE_TIME_ENTRY'; payload: TimeEntry }
  | { type: 'DELETE_TIME_ENTRY'; payload: string }
  | { type: 'SET_CALENDAR_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_CALENDAR_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_CALENDAR_EVENT'; payload: string }
  | { type: 'START_TRACKING'; payload: ActiveTracking }
  | { type: 'STOP_TRACKING' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'LOAD_STATE'; payload: AppState };

export const AREA_ICONS = [
  'code', 'camera', 'book', 'music', 'brush', 'fitness',
  'science', 'travel', 'food', 'film', 'game', 'chat',
  'heart', 'star', 'bolt', 'globe',
];

export const AREA_COLORS = [
  '#6c63ff', '#ff6584', '#43b88c', '#f5a623', '#4fc3f7',
  '#ab47bc', '#ef5350', '#66bb6a', '#ffa726', '#26c6da',
  '#ec407a', '#7e57c2', '#29b6f6', '#9ccc65', '#ff7043',
  '#78909c',
];
