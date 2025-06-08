import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { db } from '../config/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
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

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    const userDocIds = ['admin', 'inbound_staff', 'outbound_staff'];
    
    try {
      for (const docId of userDocIds) {
        const userDocRef = doc(db, 'users', docId);
        const userDocSnap = await getDoc(userDocRef);
  
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
  
          // Check if username and password match
          if (userData.username === username && userData.password === password) {
            const user = {
              id: docId,
              username: userData.username,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              password: userData.password
            };
            setUser(user);

            // Add activity log
            try {
              await addDoc(collection(db, 'activityLogs'), {
                user: user.name,
                role: user.role,
                detail: 'logged in',
                time: new Date().toISOString()
              });
            } catch (logError) {
              console.error('Error logging activity:', logError);
              // Don't fail the login if activity logging fails
            }

            return true;
          }
        }
      }
  
      // If none matched
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      // Store user data for logging before clearing
      const userData = { ...user };
      // Clear user immediately
    setUser(null);
      
      // Handle activity logging in the background
      addDoc(collection(db, 'activityLogs'), {
        user: userData.name,
        role: userData.role,
        detail: 'logged out',
        time: new Date().toISOString()
      }).catch(logError => {
        console.error('Error logging activity:', logError);
        // Don't fail the logout if activity logging fails
      });
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};