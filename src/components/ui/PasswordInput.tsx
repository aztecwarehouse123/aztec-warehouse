import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';

interface PasswordInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  autoComplete?: string;
  darkMode?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  required,
  fullWidth,
  autoComplete,
  darkMode = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Input
        label={label}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        error={error}
        placeholder={placeholder}
        required={required}
        fullWidth={fullWidth}
        autoComplete={autoComplete}
        darkMode={darkMode}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className={`absolute right-3 top-[38px] ${
          darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput; 