import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { syncUserProfile, subscribeToUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkQuota: () => { allowed: boolean; reason?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Initialize or fetch user document in Firestore
          const profile = await syncUserProfile(user.uid, user.email || '', user.displayName || '');
          setUserProfile(profile);

          // Realtime listener for subscription updates made by admin
          unsubscribeProfile = subscribeToUserProfile(user.uid, (updatedProfile) => {
            if (updatedProfile) {
              setUserProfile(updatedProfile);
            }
          });
        } catch (err) {
          console.error('Error syncing user profile with Firestore:', err);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
      const profile = await syncUserProfile(cred.user.uid, email, name);
      setUserProfile(profile);
    }
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      const profile = await syncUserProfile(
        cred.user.uid,
        cred.user.email || '',
        cred.user.displayName || ''
      );
      setUserProfile(profile);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  /**
   * Evaluates if the active user can proceed with analysis quota
   */
  const checkQuota = (): { allowed: boolean; reason?: string } => {
    if (!currentUser || !userProfile) {
      return { allowed: false, reason: 'Silakan masuk (login) terlebih dahulu untuk menganalisis pertandingan.' };
    }

    // Check expiration date if set
    if (userProfile.subscriptionEnd) {
      const end = new Date(userProfile.subscriptionEnd);
      if (new Date() > end) {
        return { allowed: false, reason: 'Subscription Anda telah berakhir.' };
      }
    }

    if (userProfile.subscriptionStatus === 'expired') {
      return { allowed: false, reason: 'Subscription Anda telah berakhir.' };
    }

    if (userProfile.subscriptionStatus === 'inactive') {
      return { allowed: false, reason: 'Status subscription Anda tidak aktif. Hubungi administrator.' };
    }

    if (userProfile.analysisUsed >= userProfile.analysisLimit) {
      return { allowed: false, reason: 'Kuota analisis Anda telah habis.' };
    }

    return { allowed: true };
  };

  const isAdmin =
    userProfile?.role === 'admin' ||
    currentUser?.email?.toLowerCase() === 'nandegg55@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin: !!isAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        checkQuota,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
