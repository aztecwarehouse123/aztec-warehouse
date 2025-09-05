import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      showToast(`Welcome back, ${user.name}!`, 'success');
      if (user.role === 'staff') {
        navigate('/add');
      } 
      if (user.role === 'supply_serve' || user.role === 'fahiz' || user.role === 'aphy'){
        navigate('/supply-serve');
      }else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    const success = await login(username, password);
    if (!success) {
      setError('Invalid username or password');
      showToast('Invalid username or password', 'error');
    }
  };

  return (
    <div className={`min-h-screen flex overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      {/* Left Panel - Hidden on Mobile */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-blue-700 text-white items-center justify-center"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-md p-8 text-center">
          {/*<PackageOpen size={80} className="mx-auto mb-6" />*/}
          <h1 className="text-4xl font-bold mb-4">AZTEC</h1>
          <p className="text-xl text-blue-100">
            Warehouse Management System
          </p>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className={`w-full max-w-md`}>
          {/* Logo for Mobile View */}
          <div className="lg:hidden text-center mb-6 space-y-2">
            <PackageOpen size={48} className="mx-auto text-blue-600" />
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>AZTEC</h1>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Warehouse Management System</p>
          </div>

          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg'} rounded-xl p-6 sm:p-8 border`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Welcome back</h2>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-slate-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            
            {error && (
              <motion.div 
                className={`${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-700'} p-4 rounded-lg mb-6 text-sm`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Username"
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<User size={20} />}
                placeholder="Enter your username"
                autoComplete="username"
                fullWidth
                darkMode={isDarkMode}
              />
              
              <PasswordInput
                label="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                fullWidth
                darkMode={isDarkMode}
              />
              
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;