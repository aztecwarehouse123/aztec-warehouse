import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PackageOpen, LayoutDashboard, Package, ShoppingCart, LogOut, Menu, X, Warehouse, BarChart, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const allNavItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard", roles: ['admin', 'inbound', 'outbound'] },
    { to: "/stock", icon: <Package size={20} />, label: "Inventory", roles: ['admin', 'inbound'] },
    { to: "/orders", icon: <ShoppingCart size={20} />, label: "Orders", roles: ['admin', 'outbound'] },
    { to: "/reports-analytics", icon: <BarChart size={20} />, label: "Reports", roles: ['admin'] },
    { to: "/warehouse-operations", icon: <Warehouse size={20} />, label: "Operations Log", roles: ['admin'] },
    { to: "/settings", icon: <Settings size={20} />, label: "Settings", roles: ['admin', 'inbound', 'outbound'] },
  ];

  const navItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : [];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      isActive 
        ? isDarkMode
          ? 'bg-slate-700 text-white'
          : 'bg-blue-100 text-blue-700'
        : isDarkMode
          ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
          : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10`}>
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
              <PackageOpen size={24} />
              <span className={`hidden sm:inline ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>AZTEC</span>
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 space-x-1">
            {navItems.map(item => (
              <NavLink 
                key={item.to} 
                to={item.to} 
                className={navLinkClasses}
                end={item.to === "/"}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{user.name}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>{user.role}</p>
                </div>
                <div className={`h-8 w-8 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} flex items-center justify-center`}>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getInitials(user.name)}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className={`p-2 ${isDarkMode ? 'text-slate-300 hover:text-red-400 hover:bg-slate-700' : 'text-slate-600 hover:text-red-600 hover:bg-slate-100'} rounded-full transition-colors`}
                  aria-label="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={toggleMobileMenu} 
              className={`md:hidden p-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} rounded-lg`}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t`}>
            <div className="container mx-auto px-4 py-3 space-y-1">
              {navItems.map(item => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={navLinkClasses}
                  onClick={closeMobileMenu}
                  end={item.to === "/"}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className={`border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}>
                {user && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} flex items-center justify-center`}>
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {getInitials(user.name)}
                        </span>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{user.name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>{user.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className={`flex items-center gap-2 px-3 py-2 ${isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-red-50'} rounded-lg transition-colors`}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;