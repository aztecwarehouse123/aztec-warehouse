import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

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
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage on app start
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Get all users from the collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
  
      // Find the user with matching username and password
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
  
          if (userData.username === username && userData.password === password) {
            const user = {
            id: doc.id,
              username: userData.username,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              password: userData.password
            };
            setUser(user);
            // Save user to localStorage for persistence
            localStorage.setItem('user', JSON.stringify(user));

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
      // Clear user from localStorage
      localStorage.removeItem('user');
      
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