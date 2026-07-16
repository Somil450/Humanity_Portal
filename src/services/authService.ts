import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole, UserStatus, CREATION_PERMISSIONS } from '../types';

// ─── Collections ──────────────────────────────────────────────────────────
const USERS_COLLECTION = 'users';

// ─── Login (replaces POST /api/auth/login) ────────────────────────────────
export const loginUser = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const user = await getUserProfile(credential.user.uid);
  if (!user) throw new Error('User profile not found. Contact your administrator.');
  if (user.status === 'inactive') throw new Error('Your account has been deactivated. Contact your administrator.');
  return user;
};

// ─── Logout (replaces client-side localStorage clear) ─────────────────────
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// ─── Get User Profile (replaces GET /api/auth/me) ─────────────────────────
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: snap.id,
    ...data,
  } as User;
};

// ─── Register User (replaces POST /api/auth/register & Cloud Function) ────────
// Creates user via REST API so the current admin doesn't get logged out
export const createEmployee = async (
  userData: { fullName: string; email: string; password?: string; role: string; department?: string },
  createdByUid: string,
  projectId: string,
  apiKey: string
): Promise<string> => {
  // 1. Create user via Firebase Auth REST API
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password || 'OneHumanity@123',
      returnSecureToken: true,
    }),
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to create user in Auth');
  }

  const uid = data.localId;

  // 2. Update display name via REST
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: data.idToken,
      displayName: userData.fullName,
    }),
  });

  // 3. Create Firestore document
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    uid,
    fullName: userData.fullName.trim(),
    email: userData.email.toLowerCase().trim(),
    role: userData.role,
    department: userData.department ?? '',
    status: 'pending',
    isTracked: true,
    phone: '',
    address: '',
    profilePhoto: '',
    createdBy: createdByUid,
    startDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Create Notification
  await addDoc(collection(db, 'notifications'), {
    recipientId: createdByUid,
    title: 'Employee Created',
    message: `${userData.fullName} (${userData.role}) has been added to the portal.`,
    tone: 'success',
    type: 'user_created',
    read: false,
    createdAt: serverTimestamp(),
  });

  return uid;
};

// ─── Change Password (replaces POST /api/auth/change-password) ─────────────
export const changeUserPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No authenticated user found.');

  // Re-authenticate before changing password (Firebase security requirement)
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

// ─── Update Super Admin Profile (replaces PATCH /api/auth/update-profile) ──
export const updateSuperAdminProfile = async (
  uid: string,
  updates: {
    fullName?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<User> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');

  const firestoreUpdates: Record<string, any> = { updatedAt: serverTimestamp() };

  if (updates.fullName) {
    await updateProfile(user, { displayName: updates.fullName });
    firestoreUpdates.fullName = updates.fullName;
  }

  if (updates.email && user.email) {
    const credential = EmailAuthProvider.credential(user.email, updates.currentPassword || '');
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, updates.email);
    firestoreUpdates.email = updates.email.toLowerCase();
  }

  if (updates.newPassword && updates.currentPassword) {
    const credential = EmailAuthProvider.credential(user.email!, updates.currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, updates.newPassword);
  }

  await updateDoc(doc(db, USERS_COLLECTION, uid), firestoreUpdates);
  const updatedUser = await getUserProfile(uid);
  if (!updatedUser) throw new Error('Failed to fetch updated profile.');
  return updatedUser;
};

// ─── Check Role Permission ────────────────────────────────────────────────
export const canCreateRole = (creatorRole: UserRole, targetRole: UserRole): boolean => {
  return CREATION_PERMISSIONS[creatorRole]?.includes(targetRole) ?? false;
};

// ─── Get All Users (admin / hr use) ──────────────────────────────────────
export const getAllUsers = async (status?: string): Promise<User[]> => {
  let q;
  if (status) {
    q = query(collection(db, USERS_COLLECTION), where('status', '==', status));
  } else {
    q = collection(db, USERS_COLLECTION);
  }
  const snap = await getDocs(q as any);
  return snap.docs.map(d => {
    const data = d.data() as Record<string, any>;
    return { uid: d.id, ...data } as User;
  });
};

// ─── Update User Profile (replaces PATCH /api/users/:id) ─────────────────
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  const { uid: _uid, createdAt, ...safeUpdates } = updates as any;
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
};

// ─── Get Current Firebase User ────────────────────────────────────────────
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
