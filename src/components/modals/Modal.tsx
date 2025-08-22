import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOutsideClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOutsideClick = true,
}) => {
  const { isDarkMode } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (closeOnOutsideClick && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose, closeOnOutsideClick]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeOnOutsideClick ? onClose : undefined} />
        
        <div className={`relative transform overflow-hidden rounded-lg ${sizeClasses[size]} w-full ${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-6 text-left shadow-xl transition-all`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
          <button
            onClick={onClose}
              className={`rounded-md p-1.5 ${isDarkMode ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} transition-colors`}
          >
            <X size={20} />
          </button>
        </div>
          
          <div className={`${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;