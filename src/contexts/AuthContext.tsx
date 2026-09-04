import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { User } from '../types';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { loadUserProfile } from '../utils/userProfile';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  authReady: boolean;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await loadUserProfile(firebaseUser.uid, firebaseUser.email);
        setUser(profile);
        if (profile) {
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail.includes('@')) {
      return false;
    }

    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const userData = user ? { ...user } : null;
    firebaseSignOut(auth).catch(console.error);

    if (userData) {
      addDoc(collection(db, 'activityLogs'), {
        user: userData.name,
        role: userData.role,
        detail: 'logged out',
        time: new Date().toISOString(),
      }).catch(logError => {
        console.error('Error logging activity:', logError);
      });
    }
  };

  // Log login after profile is loaded
  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const loginKey = `loginLogged_${auth.currentUser.uid}_${auth.currentUser.metadata.lastSignInTime}`;
    if (sessionStorage.getItem(loginKey)) return;

    sessionStorage.setItem(loginKey, '1');
    addDoc(collection(db, 'activityLogs'), {
      user: user.name,
      role: user.role,
      detail: 'logged in',
      time: new Date().toISOString(),
    }).catch(console.error);
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user && !!auth.currentUser,
    login,
    logout,
    isLoading,
    authReady,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
