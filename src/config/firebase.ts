import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// ─── Firebase Configuration (taskmate-somil project) ───────────────────────
export const firebaseConfig = {
  apiKey: 'AIzaSyBXk2Ejmkjg_MNmw2wG5HvP6645PCnPIWM',
  authDomain: 'taskmate-somil-81c1b.firebaseapp.com',
  projectId: 'taskmate-somil-81c1b',
  storageBucket: 'taskmate-somil-81c1b.firebasestorage.app',
  messagingSenderId: '405265620356',
  appId: '1:405265620356:web:382825c4bb419cf69711d1',
  measurementId: 'G-SYPK0FVY5H',
};

// ─── Initialize Firebase (prevent duplicate initialization in hot reload) ───
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Firebase Services ───────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
