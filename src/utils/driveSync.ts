const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILENAME = 'timecompass-backup.json';

export function getDriveToken(): string | null {
  return sessionStorage.getItem('googleAccessToken');
}

export async function checkDriveScope(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
    );
    const data = await res.json();
    return typeof data.scope === 'string' && data.scope.includes('drive.appdata');
  } catch {
    return false;
  }
}

export async function findBackupFile(
  token: string
): Promise<{ id: string; modifiedTime: string } | null> {
  try {
    const params = new URLSearchParams({
      spaces: 'appDataFolder',
      q: `name='${BACKUP_FILENAME}'`,
      fields: 'files(id,modifiedTime)',
    });
    const res = await fetch(`${DRIVE_FILES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.files?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function downloadBackup(
  token: string,
  fileId: string
): Promise<object | null> {
  try {
    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function uploadBackup(
  token: string,
  data: object,
  existingFileId: string | null = null
): Promise<string | null> {
  try {
    const body = JSON.stringify(data);
    let res: Response;
    if (existingFileId) {
      res = await fetch(
        `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body,
        }
      );
    } else {
      const form = new FormData();
      form.append(
        'metadata',
        new Blob(
          [JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] })],
          { type: 'application/json' }
        )
      );
      form.append('media', new Blob([body], { type: 'application/json' }));
      res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&spaces=appDataFolder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    }
    const result = await res.json();
    return result.id ?? null;
  } catch {
    return null;
  }
}

export async function syncToDrive(
  token: string,
  state: object,
  existingFileId: string | null = null
): Promise<string | null> {
  return uploadBackup(token, state, existingFileId);
}

export async function restoreFromDrive(token: string): Promise<object | null> {
  const file = await findBackupFile(token);
  if (!file) return null;
  return downloadBackup(token, file.id);
}
