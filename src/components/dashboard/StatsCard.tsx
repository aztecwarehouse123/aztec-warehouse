import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
    customIcon?: React.ReactNode;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
}) => {
  const { isDarkMode } = useTheme();
  const count = useMotionValue(0);
  const changeCount = useMotionValue(0);
  const roundedCount = useTransform(count, Math.round);
  const roundedChangeCount = useTransform(changeCount, Math.round);

  React.useEffect(() => {
    if (typeof value === 'number') {
    const animation = animate(count, value, { duration: 1 });
    if (change) {
      const changeAnimation = animate(changeCount, change.value, { duration: 1 });
      return () => {
        animation.stop();
        changeAnimation.stop();
      };
    }
    return () => animation.stop();
    }
  }, [value, change]);

  return (
    <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          <h3 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mt-1`}>
            {typeof value === 'number' ? <motion.span>{roundedCount}</motion.span> : value}
          </h3>
          {change && (
            <div className="flex items-center mt-2">
              {change.customIcon || (
                <span className={`text-sm ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {change.isPositive ? '↑' : '↓'}
                </span>
              )}
              <motion.span className={`text-sm font-medium ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {roundedChangeCount}
              </motion.span>
              {change.label && (
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>
                  {change.label}
              </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const StatsCardSkeleton: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className={`h-4 w-24 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`h-8 w-16 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>
        <div className={`p-3 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div className={`h-6 w-6 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <div className={`h-4 w-12 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`h-4 w-24 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>
      </div>
    </div>
  );
};

export { StatsCardSkeleton };
export default StatsCard;