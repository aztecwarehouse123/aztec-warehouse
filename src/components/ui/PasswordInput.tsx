import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';
import { useTheme } from '../../contexts/ThemeContext';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  className?: string;
  darkMode?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  fullWidth = false,
  className = '',
  darkMode,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { isDarkMode } = useTheme();
  const isDark = darkMode ?? isDarkMode;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Input
        label={label}
        type={showPassword ? "text" : "password"}
        error={error}
        fullWidth={fullWidth}
        className={className}
        darkMode={isDark}
        {...props}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className={`absolute right-3 top-[38px] ${
          isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput; 