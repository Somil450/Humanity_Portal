import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginUser, logoutUser, getUserProfile, changeUserPassword } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      setUser(null);
      return;
    }
    try {
      const profile = await getUserProfile(fbUser.uid);
      setUser(profile);
    } catch (e) {
      setUser(null);
    }
  }, []);

  // Listen to Firebase Auth state changes (replaces token-based session restore)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const profile = await loginUser(email, password);
      setUser(profile);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setFirebaseUser(null);
  };

  const completeOnboarding = () => {
    if (user) setUser({ ...user, status: 'active' });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await changeUserPassword(currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        logout,
        completeOnboarding,
        refreshUser,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
