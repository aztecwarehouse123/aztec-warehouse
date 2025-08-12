import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, LogOut, Menu, X, BarChart, Settings, MapPin, Activity, Plus, PackagePlus, PackageMinus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    // Navigate immediately
    navigate('/login');
    // Handle logout and activity logging in the background
    logout();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const allNavItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard", roles: ['admin'] },
    { to: "/add", icon: <Plus size={20} />, label: "Add", roles: ['admin', 'staff'] },
    { to: "/stock", icon: <PackagePlus size={20} />, label: "Inbound", roles: ['admin', 'staff'] },
    { to: "/outbound-stock", icon: <PackageMinus size={20} />, label: "Outbound", roles: ['admin', 'staff'] },
    { to: "/warehouse-locations", icon: <MapPin size={20} />, label: "Locations", roles: ['admin', 'staff'] },
    { to: "/orders", icon: <ShoppingCart size={20} />, label: "Orders", roles: [''] },
    { to: "/reports-analytics", icon: <BarChart size={20} />, label: "Reports", roles: ['admin'] },
    { to: "/warehouse-operations", icon: <Activity size={20} />, label: "Logs", roles: ['admin'] },
    { to: "/settings", icon: <Settings size={20} />, label: "Settings", roles: ['admin', 'staff'] },
    
  ];

  const navItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : [];



  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10`}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <NavLink to="/" className="flex items-center gap-2 font-semibold text-lg">
              <motion.span 
                className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                AZTEC
              </motion.span>
            </NavLink>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 space-x-1">
            {navItems.map((item, index) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
              <div className="group relative">
                <NavLink 
                  to={item.to} 
                  className={({ isActive }) => 
                    `flex items-center h-10 rounded-lg transition-all duration-300 overflow-hidden ${
                      isActive 
                        ? `px-3 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-blue-100 text-blue-700'}`
                        : `group-hover:px-3 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-100'}`
                    }`
                  }
                  {...(item.to === "/" ? { end: true } : {})}
                >
                  {({ isActive }) => (
                    <>
                      <motion.div
                        className="flex items-center justify-center w-10 h-10 flex-shrink-0"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {item.icon}
                      </motion.div>
                      <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${
                        isActive 
                          ? 'opacity-100 w-auto ml-1'
                          : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-hover:ml-1'
                      }`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </div>
              </motion.div>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <motion.div 
                className="hidden md:flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-right">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{user.name}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>{user.role}</p>
                </div>
                <motion.div 
                  className={`h-8 w-8 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} flex items-center justify-center`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getInitials(user.name)}
                  </span>
                </motion.div>
                <motion.button 
                  onClick={handleLogout}
                  className={`p-2 ${isDarkMode ? 'text-slate-300 hover:text-red-400 hover:bg-slate-700' : 'text-slate-600 hover:text-red-600 hover:bg-slate-100'} rounded-full transition-colors`}
                  aria-label="Logout"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LogOut size={20} />
                </motion.button>
              </motion.div>
            )}

            {/* Mobile Menu Button */}
            <motion.button 
              onClick={toggleMobileMenu} 
              className={`md:hidden p-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} rounded-lg`}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
      {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t`}
          >
          <div className="container mx-auto px-4 py-3 space-y-1">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
              <NavLink 
                to={item.to} 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? isDarkMode
                        ? 'bg-slate-700 text-white'
                        : 'bg-blue-100 text-blue-700'
                      : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
                onClick={closeMobileMenu}
                {...(item.to === "/" ? { end: true } : {})}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3"
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
                    </motion.div>
              </NavLink>
                </motion.div>
            ))}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}
              >
              {user && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                      <motion.div 
                        className={`h-8 w-8 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} flex items-center justify-center`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {getInitials(user.name)}
                      </span>
                      </motion.div>
                    <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{user.name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>{user.role}</p>
                    </div>
                  </div>
                    <motion.button 
                    onClick={handleLogout}
                      className={`flex items-center gap-2 px-3 py-2 ${isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-red-50'} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                    </motion.button>
                </div>
              )}
              </motion.div>
            </div>
          </motion.div>
      )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;