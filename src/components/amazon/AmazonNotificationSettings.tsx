import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

type AmazonNotificationSettingsProps = {
  className?: string;
};

const AmazonNotificationSettings: React.FC<AmazonNotificationSettingsProps> = ({ className = '' }) => {
  const { isDarkMode } = useTheme();
  const [orderEvents, setOrderEvents] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  const [syncFailures, setSyncFailures] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  const toggleRow = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (value: boolean) => void
  ) => (
    <label
      className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 rounded border-slate-500 text-blue-600 focus:ring-blue-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <p className={`font-medium text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
      </div>
    </label>
  );

  return (
    <div
      className={`rounded-lg border p-5 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      } ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Bell className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} size={20} aria-hidden />
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Amazon notification settings
        </h2>
      </div>
      <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Preferences for Selling Partner API notifications and sync alerts. These will connect to your backend when
        the integration is live.
      </p>
      <div className="space-y-3">
        {toggleRow(
          'Order status events',
          'Pending, unshipped, shipped, and cancellation updates from Amazon.',
          orderEvents,
          setOrderEvents
        )}
        {toggleRow(
          'Inventory alerts',
          'Listing and quantity discrepancies after inventory sync.',
          inventoryAlerts,
          setInventoryAlerts
        )}
        {toggleRow(
          'Sync and webhook failures',
          'Alerts when order or inventory sync fails, or notification delivery errors occur.',
          syncFailures,
          setSyncFailures
        )}
        {toggleRow('Email digest', 'Optional daily summary of Amazon-related activity.', emailDigest, setEmailDigest)}
      </div>
    </div>
  );
};

export default AmazonNotificationSettings;
