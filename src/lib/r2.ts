// R2 Upload Helper for Beat Tracker
// Uses Cloudflare R2 public upload

const R2_ENDPOINT = 'https://5f44d1beadd19dbfc73ab25c87ce005d.eu.r2.cloudflarestorage.com';
const R2_BUCKET = 'beattracker';

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
 * Make sure your bucket has public upload enabled in CORS settings
 */
export async function uploadToR2({
  file,
  folder,
  onProgress,
}: R2UploadOptions): Promise<R2UploadResult> {
  // Generate unique key
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const ext = file.name.slice(file.name.lastIndexOf('.')) || '';
  const fileName = `${timestamp}-${randomStr}${ext}`;
  const key = `${folder}/${fileName}`;

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
        const url = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
        resolve({ url, key });
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

    // Upload to R2
    const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.send(file);
  });
}

/**
 * Generate a public URL for an R2 file
 */
export function getR2Url(key: string): string {
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
}
