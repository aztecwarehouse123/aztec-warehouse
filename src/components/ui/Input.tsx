import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactElement;
  fullWidth?: boolean;
  className?: string;
  darkMode?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = false,
  className = '',
  darkMode,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const isDark = darkMode ?? isDarkMode;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'} mb-1`}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.cloneElement(icon, { size: 20 })}
          </div>
        )}
        <input
          {...props}
          className={`
            block w-full rounded-lg border px-3 py-2
            ${isDark 
              ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-700/50 disabled:text-slate-400' 
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500'
            }
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${icon ? 'pl-10' : ''}
          `}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;