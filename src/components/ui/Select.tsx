import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} mb-1`}>
          {label}
        </label>
      )}
      <select
        {...props}
        className={`
          block w-full rounded-lg border px-3 py-2
          ${isDarkMode 
            ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-700/50 disabled:text-slate-400' 
            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500'
          }
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        `}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;