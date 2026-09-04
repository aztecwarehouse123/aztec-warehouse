import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const AppLayout: React.FC = () => {
  const { isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  React.useEffect(() => {
    if (authReady && !isAuthenticated) {
      navigate('/login');
    }
  }, [authReady, isAuthenticated, navigate]);

  if (!authReady || !isAuthenticated) {
    return null;
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navbar />
      <main
        className={`flex-grow container mx-auto px-4 py-6 md:px-6 lg:px-8 ${
          isDarkMode ? 'text-slate-200' : 'text-slate-800'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;