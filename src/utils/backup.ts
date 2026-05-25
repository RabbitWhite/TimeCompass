import type { AppState } from '../types';

export const AUTO_BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const AUTO_BACKUP_KEY = 'timecompass-last-auto-backup';

export function triggerBackupDownload(state: AppState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timecompass-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}
