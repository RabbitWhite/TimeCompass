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
  weeklyTargetHours?: number;
}

export interface TemplateProjectTarget {
  projectId: string;
  weeklyTargetHours: number;
}

export interface TemplateFocusAreaTarget {
  focusAreaId: string;
  weeklyTargetHours: number;
  projectTargets: TemplateProjectTarget[];
}

export interface WeekTemplate {
  id: string;
  name: string;
  description: string;
  focusAreaTargets: TemplateFocusAreaTarget[];
  createdAt: string;
  lastUsedAt?: string;
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

export interface WalletTransaction {
  id: string;
  date: string;         // ISO string
  amount: number;       // always positive
  note: string;
  type: 'credit' | 'debit';
}

export interface ActiveTracking {
  focusAreaId: string;
  projectId: string;
  startTime: string;
}

export interface GamificationSettings {
  pointsPerTargetHour: number;   // points earned per hour of target when fully met
  balanceBasePoints: number;     // base points for perfect balance across all areas
  streakBonusPoints: number;     // bonus points per consecutive week of all-targets-met
  enabled: boolean;
  monthlyRewardBudget: number;   // euros per 4-week period, 0 = disabled
}

export interface WeeklyScore {
  weekStart: string;             // ISO date of Monday
  achievementPoints: number;     // points from hitting targets
  balancePoints: number;         // points from balanced distribution
  streakBonus: number;           // streak bonus points
  totalPoints: number;
  areaScores: AreaScore[];       // per-area breakdown
  balanceRatio: number;          // 0-1, how balanced the week was
  streakWeeks: number;           // how many consecutive weeks targets met
}

export interface AreaScore {
  focusAreaId: string;
  targetHours: number;
  actualHours: number;
  completionRate: number;        // 0-1, capped at 1
  pointsEarned: number;
}

export interface AppSettings {
  timeWindowDays: number;
  googleCalendarConnected: boolean;
  googleAccessToken: string;
  googleClientId: string;
  gamification: GamificationSettings;
  splashPhilosophyText: string;
  splashPrizeImage: string | null;
  splashDismissMode: 'tap' | 'timed';
  splashDuration: number;
  walletBalance: number;
  lastCreditedPeriodIndex: number;
  periodResetDate: string | null;
  driveBackupEnabled: boolean;
  driveLastSynced: string | null;
  driveFileId: string | null;
}

export interface AppState {
  focusAreas: FocusArea[];
  projects: Project[];
  timeEntries: TimeEntry[];
  calendarEvents: CalendarEvent[];
  activeTracking: ActiveTracking | null;
  settings: AppSettings;
  weeklyScores: WeeklyScore[];
  weekTemplates: WeekTemplate[];
  walletTransactions: WalletTransaction[];
  lastSavedTimestamp: string | null;
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
  | { type: 'UPDATE_GAMIFICATION_SETTINGS'; payload: Partial<GamificationSettings> }
  | { type: 'SAVE_WEEKLY_SCORE'; payload: WeeklyScore }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_WEEK_TEMPLATE'; payload: WeekTemplate }
  | { type: 'UPDATE_WEEK_TEMPLATE'; payload: WeekTemplate }
  | { type: 'DELETE_WEEK_TEMPLATE'; payload: string }
  | { type: 'APPLY_WEEK_TEMPLATE'; payload: string }
  | { type: 'ADD_WALLET_TRANSACTION'; payload: WalletTransaction }
  | { type: 'UPDATE_WALLET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'HARD_RESET' };

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
