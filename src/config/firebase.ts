import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// ─── Firebase Configuration ─────────────────────────────────────────────────
// TODO: Replace these values with your Firebase project config from:
// Firebase Console → Project Settings → Your apps → SDK setup & configuration
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// ─── Initialize Firebase (prevent duplicate initialization in hot reload) ───
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Firebase Services ───────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
