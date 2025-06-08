import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`rounded-lg shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${className}`}>
      {title && (
        <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;