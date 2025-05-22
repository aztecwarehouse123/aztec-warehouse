import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const AppLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6 md:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;