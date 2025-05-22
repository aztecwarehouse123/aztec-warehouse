import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    warning: <AlertCircle className="text-yellow-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`transform transition-all duration-300 ease-in-out
          ${isExiting ? 'translate-x-full opacity-0' : isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColors[type]} ${textColors[type]} shadow-lg`}
      >
        {icons[type]}
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast; 