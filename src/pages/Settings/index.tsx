import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Only validate password fields if any of them are filled
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      } else if (formData.currentPassword !== user?.password) {
        newErrors.currentPassword = 'Current password is incorrect';
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (validate()) {
      setIsLoading(true);
      
      try {
        // Prepare update data
        const updateData: {
          username: string;
          email: string;
          name: string;
          password?: string;
        } = {
          username: formData.username,
          email: formData.email,
          name: formData.name,
          password: (formData.currentPassword!= '' && formData.confirmPassword!='' && formData.newPassword!='')? formData.newPassword : user.password,
        };

        // Update user data in Firestore
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updateData);
        
        // Update local user context
        setUser({
          ...user,
          username: formData.username,
          email: formData.email,
          name: formData.name,
          password: formData.newPassword || user.password
        });
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        
        // Show success toast
        showToast('Profile updated successfully!', 'success');
      } catch (error) {
        console.error('Error updating profile:', error);
        setErrors({ submit: 'Failed to update profile. Please try again.' });
        showToast('Failed to update profile. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Settings</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Update your profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className={`h-24 w-24 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} flex items-center justify-center`}>
              <span className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {getInitials(user?.name || '')}
              </span>
            </div>
          </div>
          <div>
            <h2 className={`text-lg font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formData.name}</h2>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{user?.email}</p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder={user?.username}
              required
              fullWidth
              darkMode={isDarkMode}
            />
            
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder={user?.email}
              required
              fullWidth
              darkMode={isDarkMode}
            />
          </div>
          
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder={user?.username}
            required
            fullWidth
            darkMode={isDarkMode}
          />
        </div>

        {/* Change Password */}
        <div className="space-y-4">
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Change Password</h3>
          <PasswordInput
            label="Current Password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            error={errors.currentPassword}
            placeholder="Enter current password"
            fullWidth
            darkMode={isDarkMode}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              placeholder="Enter new password"
              fullWidth
              darkMode={isDarkMode}
            />
            
            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="Confirm new password"
              fullWidth
              darkMode={isDarkMode}
            />
          </div>
        </div>

        {errors.submit && (
          <div className="text-red-500 text-sm">{errors.submit}</div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
            icon={<User size={18} />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings; 