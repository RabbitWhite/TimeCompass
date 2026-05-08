import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction, WalletTransaction } from './types';

const STORAGE_KEY = 'timecompass-state';
const LEGACY_STORAGE_KEY = 'lifetracker-state';
export const RECOVERY_KEY = 'timecompass-recovery';

const defaultState: AppState = {
  focusAreas: [],
  projects: [],
  timeEntries: [],
  calendarEvents: [],
  activeTracking: null,
  settings: {
    timeWindowDays: 7,
    googleCalendarConnected: false,
    googleAccessToken: '',
    googleClientId: '',
    gamification: {
      pointsPerTargetHour: 10,
      balanceBasePoints: 20,
      streakBonusPoints: 15,
      enabled: true,
      monthlyRewardBudget: 0,
    },
    splashPhilosophyText: '',
    splashPrizeImage: null,
    splashDismissMode: 'tap',
    splashDuration: 5,
    walletBalance: 0,
    lastCreditedPeriodIndex: -1,
    periodResetDate: null,
    driveBackupEnabled: false,
    driveLastSynced: null,
    driveFileId: null,
  },
  weeklyScores: [],
  weekTemplates: [],
  walletTransactions: [],
  lastSavedTimestamp: null,
};

const SESSION_TOKEN_KEY = 'googleAccessToken';

let loadFailed = false;

function loadState(): AppState {
  try {
    // One-time migration: copy legacy data to new key then remove old key
    if (!localStorage.getItem(STORAGE_KEY)) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      let parsed: AppState;
      try {
        parsed = JSON.parse(stored);
      } catch (err) {
        console.error('[store] Failed to parse stored state — preserving raw localStorage data untouched.', err);
        loadFailed = true;
        return defaultState;
      }
      // googleAccessToken is short-lived — read from sessionStorage, not localStorage
      const googleAccessToken = sessionStorage.getItem(SESSION_TOKEN_KEY) ?? '';
      const loaded = {
        ...defaultState,
        ...parsed,
        settings: {
          ...defaultState.settings,
          ...parsed.settings,
          googleAccessToken,
          gamification: { ...defaultState.settings.gamification, ...parsed.settings?.gamification },
          // Explicit fallbacks for Drive-critical fields — ?? so false is respected,
          // || for googleClientId so empty string also falls back to default.
          driveBackupEnabled: parsed.settings?.driveBackupEnabled ?? defaultState.settings.driveBackupEnabled,
          googleClientId: parsed.settings?.googleClientId || defaultState.settings.googleClientId,
        },
        weeklyScores: parsed.weeklyScores || [],
        weekTemplates: parsed.weekTemplates || [],
        walletTransactions: parsed.walletTransactions || [],
      };
      console.log(`[store] Loaded state: ${loaded.focusAreas.length} focusAreas, ${loaded.timeEntries.length} timeEntries`);
      return loaded;
    }
  } catch (err) {
    console.error('[store] Unexpected error in loadState — preserving localStorage untouched.', err);
    loadFailed = true;
  }
  return defaultState;
}

export function writeRecoveryRecord(clientId: string, driveBackupEnabled: boolean): void {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ clientId, driveBackupEnabled }));
  } catch { /* ignore */ }
}

export function readRecoveryRecord(): { clientId: string; driveBackupEnabled: boolean } | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { clientId: string; driveBackupEnabled: boolean };
  } catch {
    return null;
  }
}

function saveState(state: AppState) {
  try {
    // Persist googleAccessToken to sessionStorage only (token is short-lived)
    sessionStorage.setItem(SESSION_TOKEN_KEY, state.settings.googleAccessToken ?? '');
    // Save all other state to localStorage, excluding the access token
    const { googleAccessToken: _omit, ...otherSettings } = state.settings;
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      settings: otherSettings,
      lastSavedTimestamp: now,
    }));
    writeRecoveryRecord(state.settings.googleClientId, state.settings.driveBackupEnabled);
  } catch { /* ignore */ }
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FOCUS_AREA':
      return { ...state, focusAreas: [...state.focusAreas, action.payload] };
    case 'UPDATE_FOCUS_AREA':
      return { ...state, focusAreas: state.focusAreas.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_FOCUS_AREA':
      return {
        ...state,
        focusAreas: state.focusAreas.filter(a => a.id !== action.payload),
        projects: state.projects.filter(p => p.focusAreaId !== action.payload),
        timeEntries: state.timeEntries.filter(t => t.focusAreaId !== action.payload),
      };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
    case 'ADD_TIME_ENTRY':
      return { ...state, timeEntries: [...state.timeEntries, action.payload] };
    case 'UPDATE_TIME_ENTRY':
      return { ...state, timeEntries: state.timeEntries.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TIME_ENTRY':
      return { ...state, timeEntries: state.timeEntries.filter(t => t.id !== action.payload) };
    case 'SET_CALENDAR_EVENTS':
      return { ...state, calendarEvents: action.payload };
    case 'ADD_CALENDAR_EVENT':
      return { ...state, calendarEvents: [...state.calendarEvents, action.payload] };
    case 'DELETE_CALENDAR_EVENT':
      return { ...state, calendarEvents: state.calendarEvents.filter(e => e.id !== action.payload) };
    case 'START_TRACKING':
      return { ...state, activeTracking: action.payload };
    case 'STOP_TRACKING':
      return { ...state, activeTracking: null };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_GAMIFICATION_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          gamification: { ...state.settings.gamification, ...action.payload },
        },
      };
    case 'SAVE_WEEKLY_SCORE': {
      const existing = state.weeklyScores.findIndex(
        s => s.weekStart === action.payload.weekStart
      );
      const scores = [...state.weeklyScores];
      if (existing >= 0) {
        scores[existing] = action.payload;
      } else {
        scores.push(action.payload);
      }
      // Keep only last 52 weeks
      scores.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
      return { ...state, weeklyScores: scores.slice(0, 52) };
    }
    case 'LOAD_STATE': {
      const payloadSettings = action.payload.settings;
      return {
        ...action.payload,
        settings: {
          ...defaultState.settings,
          ...payloadSettings,
          googleAccessToken: state.settings.googleAccessToken,
          googleClientId:
            payloadSettings.googleClientId || state.settings.googleClientId,
          driveBackupEnabled:
            payloadSettings.driveBackupEnabled ?? state.settings.driveBackupEnabled,
          driveFileId:
            payloadSettings.driveFileId ?? state.settings.driveFileId,
          driveLastSynced:
            payloadSettings.driveLastSynced ?? state.settings.driveLastSynced,
          gamification: {
            ...defaultState.settings.gamification,
            ...payloadSettings.gamification,
          },
        },
      };
    }
    case 'ADD_WEEK_TEMPLATE':
      return { ...state, weekTemplates: [...state.weekTemplates, action.payload] };
    case 'UPDATE_WEEK_TEMPLATE':
      return { ...state, weekTemplates: state.weekTemplates.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_WEEK_TEMPLATE':
      return { ...state, weekTemplates: state.weekTemplates.filter(t => t.id !== action.payload) };
    case 'APPLY_WEEK_TEMPLATE': {
      const template = state.weekTemplates.find(t => t.id === action.payload);
      if (!template) return state;
      const updatedFocusAreas = state.focusAreas.map(area => {
        const target = template.focusAreaTargets.find(t => t.focusAreaId === area.id);
        return target ? { ...area, weeklyTargetHours: target.weeklyTargetHours } : area;
      });
      const updatedProjects = state.projects.map(project => {
        for (const areaTarget of template.focusAreaTargets) {
          const pt = areaTarget.projectTargets.find(p => p.projectId === project.id);
          if (pt) return { ...project, weeklyTargetHours: pt.weeklyTargetHours };
        }
        return project;
      });
      const updatedTemplates = state.weekTemplates.map(t =>
        t.id === action.payload ? { ...t, lastUsedAt: new Date().toISOString() } : t
      );
      return { ...state, focusAreas: updatedFocusAreas, projects: updatedProjects, weekTemplates: updatedTemplates };
    }
    case 'ADD_WALLET_TRANSACTION':
      return { ...state, walletTransactions: [action.payload, ...state.walletTransactions] };
    case 'UPDATE_WALLET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'HARD_RESET':
      return {
        ...state,
        timeEntries: [],
        calendarEvents: [],
        weeklyScores: [],
        walletTransactions: [],
        activeTracking: null,
        settings: {
          ...state.settings,
          walletBalance: 0,
          lastCreditedPeriodIndex: -1,
          periodResetDate: null,
        },
      };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    if (!loadFailed) {
      saveState(state);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
