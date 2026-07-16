import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Generic Helpers ──────────────────────────────────────────────────────

/** Convert Firestore Timestamp fields to ISO strings recursively */
export const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (data instanceof Timestamp) return data.toDate().toISOString();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = convertTimestamps(data[key]);
    }
    return result;
  }
  return data;
};

/** Build a document from a Firestore snapshot */
export const docFromSnap = <T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T | null => {
  if (!snap.exists()) return null;
  return { id: snap.id, ...convertTimestamps(snap.data()) } as T;
};

// ─── CRUD Wrappers ────────────────────────────────────────────────────────

export const getDocument = async <T>(collectionName: string, docId: string): Promise<T | null> => {
  const snap = await getDoc(doc(db, collectionName, docId));
  return docFromSnap<T>(snap);
};

export const createDocument = async <T extends object>(
  collectionName: string,
  data: T,
  docId?: string
): Promise<string> => {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (docId) {
    await setDoc(doc(db, collectionName, docId), payload);
    return docId;
  }
  const ref = await addDoc(collection(db, collectionName), payload);
  return ref.id;
};

export const updateDocument = async <T extends object>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> => {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDocument = async (collectionName: string, docId: string): Promise<void> => {
  await deleteDoc(doc(db, collectionName, docId));
};

export const queryDocuments = async <T>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> => {
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => docFromSnap<T>(d)!).filter(Boolean);
};

// ─── Real-time Listeners ──────────────────────────────────────────────────

export const listenToDocument = <T>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T | null) => void
): (() => void) => {
  return onSnapshot(doc(db, collectionName, docId), (snap) => {
    onUpdate(docFromSnap<T>(snap));
  });
};

export const listenToQuery = <T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onUpdate: (data: T[]) => void
): (() => void) => {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map(d => docFromSnap<T>(d)!).filter(Boolean));
  });
};

// ─── Batch Operations ─────────────────────────────────────────────────────

export const batchUpdateDocuments = async (
  updates: Array<{ collectionName: string; docId: string; data: object }>
): Promise<void> => {
  const batch = writeBatch(db);
  for (const { collectionName, docId, data } of updates) {
    batch.update(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

// ─── Re-export Firestore query helpers for service use ────────────────────
export { where, orderBy, limit, startAfter, increment, Timestamp, serverTimestamp };
