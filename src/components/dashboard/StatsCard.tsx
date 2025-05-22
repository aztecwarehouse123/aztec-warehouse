import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
    customIcon?: React.ReactNode;
  };
  darkMode?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  change,
  darkMode = false 
}) => {
  const count = useMotionValue(0);
  const changeCount = useMotionValue(0);
  const roundedCount = useTransform(count, Math.round);
  const roundedChangeCount = useTransform(changeCount, Math.round);

  React.useEffect(() => {
    const animation = animate(count, value, { duration: 1 });
    if (change) {
      const changeAnimation = animate(changeCount, change.value, { duration: 1 });
      return () => {
        animation.stop();
        changeAnimation.stop();
      };
    }
    return () => animation.stop();
  }, [value, change]);

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          <motion.h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'} mt-1`}>
            {roundedCount}
          </motion.h3>
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
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>
                  {change.label}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;