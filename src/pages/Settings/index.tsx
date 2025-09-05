import React, { useState, useEffect, useCallback } from 'react';
import { User, Moon, Sun, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import { db } from '../../config/firebase';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { User as UserType } from '../../types';
import Modal from '../../components/modals/Modal';
import Select from '../../components/ui/Select';

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<UserType[]>([]);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserFormData, setAddUserFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });
  const [addUserErrors, setAddUserErrors] = useState<Record<string, string>>({});
  const [userEditErrors, setUserEditErrors] = useState<Record<string, string>>({});
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ username: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [userEditForm, setUserEditForm] = useState({
    username: '',
    email: '',
    name: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch all users when component mounts
  const fetchUsers = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserType[];
        setUsers(usersData);
        console.log('Fetched users:', usersData.map(u => ({ id: u.id, username: u.username, name: u.name })));
      } catch (error) {
        console.error('Error fetching users:', error);
        showToast('Error fetching users', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  }, [user?.role, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [user?.role, showToast, fetchUsers]);

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
    
    // Only validate email format if an email is provided
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
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

        // Track changes for activity log
        const changes = [];
        if (user.username !== formData.username) {
          changes.push(`changed username from "${user.username}" to "${formData.username}"`);
        }
        if (user.email !== formData.email) {
          changes.push(`changed email from "${user.email}" to "${formData.email}"`);
        }
        if (user.name !== formData.name) {
          changes.push(`changed full name from "${user.name}" to "${formData.name}"`);
        }
        if (formData.currentPassword && formData.newPassword) {
          changes.push('changed their password');
        }

        // Update user data in Firestore
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updateData);
        
        // Add activity log if there were changes
        if (changes.length > 0) {
          await addDoc(collection(db, 'activityLogs'), {
            user: user.name,
            role: user.role,
            detail: changes.length === 1 
              ? changes[0] 
              : `made multiple profile changes: ${changes.join('; ')}`,
            time: new Date().toISOString()
          });
        }
        
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

  const handleEditUser = (user: UserType) => {
    console.log('Editing user:', user);
    setEditingUser(user);
    setUserEditErrors({}); // Clear previous errors
    setUserEditForm({
      username: user.username,
      email: user.email,
      name: user.name,
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleUserEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (userEditErrors[name]) {
      setUserEditErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsLoading(true);
      setUserEditErrors({}); // Clear previous errors

      // Validate required fields
      if (!userEditForm.username.trim()) {
        setUserEditErrors({ username: 'Username is required' });
        return;
      }
      
      if (!userEditForm.name.trim()) {
        setUserEditErrors({ name: 'Name is required' });
        return;
      }

      // Validate passwords match if either is filled
      if (userEditForm.newPassword || userEditForm.confirmPassword) {
        if (userEditForm.newPassword !== userEditForm.confirmPassword) {
          setUserEditErrors({ confirmPassword: 'Passwords do not match' });
          return;
        }
        if (userEditForm.newPassword.length < 6) {
          setUserEditErrors({ newPassword: 'Password must be at least 6 characters' });
          return;
        }
      }

      console.log('Updating user:', editingUser.id);
      console.log('Editing user object:', editingUser);
      console.log('Update data:', {
        username: userEditForm.username,
        email: userEditForm.email,
        name: userEditForm.name,
        password: userEditForm.newPassword ? '***' : 'unchanged'
      });

      const userRef = doc(db, 'users', editingUser.id);
      console.log('User reference:', userRef.path);
      
      const updateData: Partial<UserType> = {
        username: userEditForm.username,
        email: userEditForm.email,
        name: userEditForm.name,
        role: editingUser.role // Preserve the existing role
      };

      if (userEditForm.newPassword) {
        updateData.password = userEditForm.newPassword;
      }

      console.log('Attempting to update document with data:', updateData);
      try {
        await updateDoc(userRef, updateData);
        console.log('User updated successfully in Firestore');
      } catch (updateError) {
        console.error('Failed to update by ID, trying to find by username:', updateError);
        
        // Fallback: try to find the user by username
        const usersQuery = query(collection(db, 'users'), where('username', '==', editingUser.username));
        const userSnapshot = await getDocs(usersQuery);
        
        if (!userSnapshot.empty) {
          const actualUserDoc = userSnapshot.docs[0];
          console.log('Found user by username, actual ID:', actualUserDoc.id);
          
          const actualUserRef = doc(db, 'users', actualUserDoc.id);
          await updateDoc(actualUserRef, updateData);
          console.log('User updated successfully using fallback method');
          
          // Update the local state with the correct ID
          setUsers(prevUsers => 
            prevUsers.map(u => 
              u.username === editingUser.username 
                ? { ...u, id: actualUserDoc.id, ...updateData }
                : u
            )
          );
        } else {
          throw new Error('User not found by username either');
        }
      }

      // Log the activity
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name,
        role: user?.role,
        detail: `updated user "${editingUser.name}" (username: ${userEditForm.username})`,
        time: new Date().toISOString()
      });

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === editingUser.id 
            ? { ...u, ...updateData }
            : u
        )
      );

      showToast('User updated successfully', 'success');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      console.error('Error details:', {
        editingUser: editingUser,
        userEditForm: userEditForm,
        error: error
      });
      showToast('Failed to update user', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (addUserErrors[name]) {
      setAddUserErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateAddUser = () => {
    const newErrors: Record<string, string> = {};
    
    if (!addUserFormData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (addUserFormData.email.trim() && !/\S+@\S+\.\S+/.test(addUserFormData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!addUserFormData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!addUserFormData.password) {
      newErrors.password = 'Password is required';
    } else if (addUserFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (addUserFormData.password !== addUserFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setAddUserErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAddUser()) return;
    
    setIsLoading(true);
    
    try {
      // Check if username or email already exists
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const existingUsers = usersSnapshot.docs.map(doc => doc.data());
      
      if (existingUsers.some(u => u.username === addUserFormData.username)) {
        setAddUserErrors({ username: 'Username already exists' });
        return;
      }
      
      // Only check if email exists if an email is provided
      if (addUserFormData.email.trim() && existingUsers.some(u => u.email === addUserFormData.email)) {
        setAddUserErrors({ email: 'Email already exists' });
        return;
      }

      // Add new user to Firestore
      const newUserRef = await addDoc(collection(db, 'users'), {
        username: addUserFormData.username,
        email: addUserFormData.email,
        name: addUserFormData.name,
        password: addUserFormData.password,
        role: addUserFormData.role,
      });

      // Add activity log
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name,
        role: user?.role,
        detail: `added new user "${addUserFormData.name}" with role "${addUserFormData.role}"`,
        time: new Date().toISOString()
      });

      // Update local state
      setUsers(prev => [...prev, {
        id: newUserRef.id,
        username: addUserFormData.username,
        email: addUserFormData.email,
        name: addUserFormData.name,
        role: addUserFormData.role as UserType['role'],
        password: addUserFormData.password
      }]);

      // Reset form and close modal
      setAddUserFormData({
        username: '',
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        role: 'staff'
      });
      setIsAddUserModalOpen(false);
      
      showToast('User added successfully!', 'success');
    } catch (error) {
      console.error('Error adding user:', error);
      showToast('Failed to add user. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userName: string, username: string) => {
    setUserToDelete({ username: username, name: userName });
    setShowConfirmDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsLoading(true);
      
      // Find the user by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', userToDelete.username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast('User not found.', 'error');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, 'users', userDoc.id);

      // Delete user from Firestore
      await deleteDoc(userRef);

      // Add activity log
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name,
        role: user?.role,
        detail: `deleted user "${userToDelete.name}" (username: ${userToDelete.username})`,
        time: new Date().toISOString()
      });

      // Update local state
      setUsers(prev => prev.filter(u => u.username !== userToDelete.username));
      
      showToast('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      setShowConfirmDeleteModal(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Settings</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Update your profile information</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Button
              variant="secondary"
              onClick={fetchUsers}
              className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          )}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-yellow-400 hover:bg-slate-700' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => {
            setEditingUser(null);
            setUserEditErrors({});
          }}
          title="Edit User"
          size="md"
        >
            <div className="space-y-4">
              <Input
                label="Username"
                name="username"
                value={userEditForm.username}
                onChange={handleUserEditChange}
                error={userEditErrors.username}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={userEditForm.email}
                onChange={handleUserEditChange}
                error={userEditErrors.email}
              />
              <Input
                label="Name"
                name="name"
                value={userEditForm.name}
                onChange={handleUserEditChange}
                error={userEditErrors.name}
              />
              <PasswordInput
                label="New Password"
                name="newPassword"
                value={userEditForm.newPassword}
                onChange={handleUserEditChange}
                error={userEditErrors.newPassword}
              />
              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                value={userEditForm.confirmPassword}
                onChange={handleUserEditChange}
                error={userEditErrors.confirmPassword}
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingUser(null);
                  setUserEditErrors({});
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update User'}
              </Button>
            </div>
        </Modal>
      )}

      {/* Confirm Delete User Modal */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-6`}>
          Are you sure you want to delete user &quot;{userToDelete?.name}&quot; (username: {userToDelete?.username})?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowConfirmDeleteModal(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDeleteUser}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>

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
              placeholder={user?.email || "Enter email (optional)"}
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

      {/* User Management Section */}
      {user?.role === 'admin' && (
        <div className={`mt-8 p-6 rounded-lg ${isDarkMode ? 'bg-slate-1000' : 'bg-white'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-center md:text-left`}>
              User Management
            </h2>
            <Button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 self-center md:self-auto"
            >
              <User size={16} />
              Add New User
            </Button>
          </div>

          {/* Responsive User List: Table on md+, Cards on mobile */}
          <div className={`rounded-lg shadow overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
            {/* Table for md+ screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}> 
                <thead className={isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Username</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Email</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Role</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700 bg-slate-800' : 'divide-gray-200 bg-white'}`}> 
                  {users
                    .filter(userItem => userItem.id !== user?.id)
                    .map((userItem) => (
                    <tr key={userItem.id} className={isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{userItem.username}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{userItem.email || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{userItem.name}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                        {userItem.role === 'admin' ? 'Admin' : 
                         userItem.role === 'staff' ? 'Staff' : 
                         userItem.role === 'supply_serve' ? 'Supply & Serve' :
                         userItem.role === 'fahiz' ? 'Fahiz' :
                         userItem.role === 'aphy' ? 'APHY' : 
                         userItem.role}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}> 
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditUser(userItem)}
                            className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteUser(userItem.name, userItem.username)}
                            className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards for mobile screens */}
            <div className="md:hidden flex flex-col gap-4 p-2">
              {users.filter(userItem => userItem.id !== user?.id).map((userItem) => (
                <div
                  key={userItem.id}
                  className={`rounded-lg shadow p-4 flex flex-col gap-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{userItem.name}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{userItem.username}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(userItem)}
                        className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(userItem.name, userItem.username)}
                        className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{userItem.email || '-'}</div>
                  <div className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {userItem.role === 'admin' ? 'Admin' : 
                     userItem.role === 'staff' ? 'Staff' : 
                     userItem.role === 'supply_serve' ? 'Supply & Serve' :
                     userItem.role === 'fahiz' ? 'Fahiz' :
                     userItem.role === 'aphy' ? 'APHY' : 
                     userItem.role}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add User Modal */}
          <Modal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            title="Add New User"
            size="xl"
          >
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Username"
                  name="username"
                  value={addUserFormData.username}
                  onChange={handleAddUserChange}
                  error={addUserErrors.username}
                  required
                  fullWidth
                  placeholder="Enter username (e.g., john.doe)"
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={addUserFormData.email}
                  onChange={handleAddUserChange}
                  error={addUserErrors.email}
                  fullWidth
                  placeholder="Enter email address (optional)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={addUserFormData.name}
                  onChange={handleAddUserChange}
                  error={addUserErrors.name}
                  required
                  fullWidth
                  placeholder="Enter full name (e.g., John Doe)"
                />
                <Select
                  label="Role"
                  name="role"
                  value={addUserFormData.role}
                  onChange={handleAddUserChange}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'staff', label: 'Staff' },
                    { value: 'supply_serve', label: 'Supply & Serve' },
                    { value: 'fahiz', label: 'Fahiz' },
                    { value: 'aphy', label: 'APHY' },
                  ]}
                  fullWidth
                />
              </div>
              <PasswordInput
                label="Password"
                name="password"
                value={addUserFormData.password}
                onChange={handleAddUserChange}
                error={addUserErrors.password}
                required
                fullWidth
                placeholder="Enter password (min. 6 characters)"
              />
              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                value={addUserFormData.confirmPassword}
                onChange={handleAddUserChange}
                error={addUserErrors.confirmPassword}
                required
                fullWidth
                placeholder="Confirm your password"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Add User
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default Settings; 