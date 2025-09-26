import { User } from '../types';

/**
 * Check if a user can see prices
 * Only admin users can see prices, manager and other roles cannot
 */
export const canSeePrices = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Check if a user has admin-level access (admin or manager)
 */
export const hasAdminAccess = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'manager';
};

/**
 * Check if a user can manage users (admin or manager)
 */
export const canManageUsers = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'manager';
};
