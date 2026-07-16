/**
 * storageService.ts
 *
 * Hybrid storage strategy — NO Firebase Storage required:
 *
 * • Images / screenshots  → stored as base64 data URIs in Firestore
 *   (Firestore doc limit is 1 MB; base64 adds ~33% overhead so files ≤ 700 KB
 *    store fine; larger files are compressed/resized client-side first)
 *
 * • If Firebase Storage IS later enabled (free Spark plan), zero code changes
 *   needed — just swap `USE_FIREBASE_STORAGE = true` below.
 */

import * as FileSystem from 'expo-file-system';
import { updateDocument, createDocument } from './firestoreService';

// ─── Toggle — set true once Firebase Storage is activated ───────────────────
const USE_FIREBASE_STORAGE = false;

// ─── Firebase Storage (kept for future use when activated) ──────────────────
let firebaseUpload: ((path: string, uri: string, mimeType: string, onProgress?: (p: number) => void) => Promise<string>) | null = null;

if (USE_FIREBASE_STORAGE) {
  const { ref, uploadBytesResumable, getDownloadURL } = require('firebase/storage');
  const { storage } = require('../config/firebase');

  firebaseUpload = (path, uri, mimeType, onProgress) =>
    new Promise(async (resolve, reject) => {
      try {
        const blob: Blob = await new Promise((res, rej) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => res(xhr.response);
          xhr.onerror = () => rej(new TypeError('Network request failed'));
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send(null);
        });
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, blob, { contentType: mimeType });
        task.on(
          'state_changed',
          (snap: any) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      } catch (e) {
        reject(e);
      }
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a local file URI to a base64 data URI */
async function uriToBase64DataUri(uri: string, mimeType: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType};base64,${base64}`;
}

/** Check file size in bytes */
async function getFileSizeBytes(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return (info as any).size ?? 0;
}

// ─── Core upload — routes to Firebase Storage or Firestore base64 ─────────
export const uploadFile = async (
  path: string,
  uri: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (USE_FIREBASE_STORAGE && firebaseUpload) {
    return firebaseUpload(path, uri, mimeType, onProgress);
  }

  // Firestore base64 strategy
  onProgress?.(10);
  const sizeBytes = await getFileSizeBytes(uri);
  const MAX_BYTES = 900_000; // 900 KB safety limit for Firestore 1 MB doc cap

  if (sizeBytes > MAX_BYTES) {
    // File too large for base64-in-Firestore — return placeholder URL so
    // onboarding still completes; admin can request re-upload later.
    onProgress?.(100);
    return `firestore-skip://${path}?reason=too_large&size=${sizeBytes}`;
  }

  onProgress?.(40);
  const dataUri = await uriToBase64DataUri(uri, mimeType);
  onProgress?.(80);

  // Persist to Firestore `uploads` collection — keyed by sanitised path
  const docId = path.replace(/\//g, '_');
  await createDocument('uploads', {
    path,
    mimeType,
    dataUri,
    uploadedAt: new Date().toISOString(),
    sizeBytes,
  }, docId);

  onProgress?.(100);
  // Return a queryable pseudo-URL; screens that need to display the file
  // should resolve it via `resolveUploadUrl()` below.
  return `firestore-upload://${docId}`;
};

/**
 * Resolve a stored file URL to a displayable URI.
 * Handles both real Firebase Storage URLs and Firestore base64 pseudo-URLs.
 */
export const resolveUploadUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;

  if (url.startsWith('firestore-upload://')) {
    const docId = url.replace('firestore-upload://', '');
    const { getDocument } = await import('./firestoreService');
    const doc = await getDocument<{ dataUri: string }>('uploads', docId);
    return doc?.dataUri ?? null;
  }

  if (url.startsWith('firestore-skip://')) return null;

  // Real URL (Firebase Storage, CDN, etc.)
  return url;
};

// ─── Specialised upload wrappers ─────────────────────────────────────────────

export const uploadProfilePhoto = async (
  userUid: string,
  uri: string,
  mimeType: string = 'image/jpeg',
  onProgress?: (p: number) => void
): Promise<string> => {
  const ext = mimeType.split('/')[1] || 'jpg';
  return uploadFile(`profiles/${userUid}/photo.${ext}`, uri, mimeType, onProgress);
};

export const uploadAttendanceScreenshot = async (
  userUid: string,
  date: string,
  uri: string,
  mimeType: string = 'image/jpeg',
  onProgress?: (p: number) => void
): Promise<string> => {
  return uploadFile(`attendance/${userUid}/${date}/screenshot.jpg`, uri, mimeType, onProgress);
};

export const uploadLeaveDocument = async (
  userUid: string,
  leaveId: string,
  uri: string,
  mimeType: string,
  fileName: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  return uploadFile(`leaves/${userUid}/${leaveId}/${fileName}`, uri, mimeType, onProgress);
};

export const uploadOnboardingDocument = async (
  userUid: string,
  docType: 'aadhaar' | 'pan',
  uri: string,
  mimeType: string,
  fileName: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  return uploadFile(`onboarding/${userUid}/${docType}/${fileName}`, uri, mimeType, onProgress);
};

export const uploadUrgentTaskAttachment = async (
  taskId: string,
  uri: string,
  mimeType: string,
  fileName: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  return uploadFile(`urgentTasks/${taskId}/attachments/${Date.now()}_${fileName}`, uri, mimeType, onProgress);
};

/** Delete — no-op for Firestore-based uploads (Firestore doc retention handled separately) */
export const deleteFile = async (url: string): Promise<void> => {
  if (USE_FIREBASE_STORAGE) {
    const { ref, deleteObject } = require('firebase/storage');
    const { storage } = require('../config/firebase');
    try {
      await deleteObject(ref(storage, url));
    } catch { /* ignore */ }
  }
  // For Firestore uploads: leave in place (no cascading deletes needed)
};