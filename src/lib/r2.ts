// R2 Upload Helper for Beat Tracker
// Uses Cloudflare R2 public upload

const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const R2_API_TOKEN = import.meta.env.VITE_R2_API_TOKEN;
const R2_BUCKET = import.meta.env.VITE_R2_BUCKET || 'beattracker';

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`;

export interface R2UploadOptions {
  file: File;
  folder: string; // e.g. 'beats/userId'
  onProgress?: (progress: number) => void;
}

export interface R2UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to Cloudflare R2
 * Requires a valid R2 API token with write access.
 */
export async function uploadToR2({
  file,
  folder,
  onProgress,
}: R2UploadOptions): Promise<R2UploadResult> {
  if (!R2_ACCOUNT_ID) {
    throw new Error('R2 account ID is not configured. Set VITE_R2_ACCOUNT_ID.');
  }
  if (!R2_API_TOKEN) {
    throw new Error('R2 API token is missing. Set VITE_R2_API_TOKEN.');
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const ext = file.name.slice(file.name.lastIndexOf('.')) || '';
  const fileName = `${timestamp}-${randomStr}${ext}`;
  const key = `${folder}/${fileName}`;
  const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve({ url: uploadUrl, key });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed - network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('Authorization', `Bearer ${R2_API_TOKEN}`);
    xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
    xhr.send(file);
  });
}

export function getR2Url(key: string): string {
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
}
