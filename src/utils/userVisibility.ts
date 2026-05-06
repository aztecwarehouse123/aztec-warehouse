import { User } from '../types';

/** Only `amazon_admin` can see other `amazon_admin` users in Settings (regular admin cannot). */
export const canViewAmazonAdminUsers = (viewer: User | null): boolean => {
  return viewer?.role === 'amazon_admin';
};

/** Roles allowed to assign the `amazon_admin` role when creating or editing users. */
export const canAssignAmazonAdminRole = (viewer: User | null): boolean => {
  return viewer?.role === 'admin' || viewer?.role === 'amazon_admin';
};

/**
 * Filter users for the Settings management list: hide `amazon_admin` unless viewer is `amazon_admin`.
 */
export const filterUsersForManagementList = (list: User[], viewer: User | null): User[] => {
  const showAmazonAdmins = canViewAmazonAdminUsers(viewer);
  return list.filter((u) => {
    if (!showAmazonAdmins && u.role === 'amazon_admin') return false;
    return true;
  });
};
