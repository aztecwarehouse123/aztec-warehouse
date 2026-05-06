import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Truck, PackageCheck, ClipboardList } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const AmazonFulfillment: React.FC = () => {
  const { isDarkMode } = useTheme();

  const fbmSteps = [
    'Pick items (linked with Jobs page)',
    'Pack and verify quantities',
    'Confirm shipment with carrier and tracking',
    'Send shipment confirmation to Amazon',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Amazon Fulfillment</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          FBM operational workflow. FBA shipments remain Amazon-managed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Actionable queue</p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>12</p>
          <p className="text-xs text-amber-500 mt-1">FBM unshipped orders</p>
        </div>
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Awaiting pick</p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>7</p>
          <p className="text-xs text-blue-500 mt-1">Create/open Jobs tasks</p>
        </div>
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ready to confirm</p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>3</p>
          <p className="text-xs text-green-500 mt-1">Tracking details required</p>
        </div>
      </div>

      <div className={`rounded-lg border p-5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>FBM fulfillment flow</h2>
        <div className="space-y-3">
          {fbmSteps.map((step) => (
            <div key={step} className={`flex items-center gap-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <CheckCircle2 size={16} className="text-green-500" />
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Operations panel (prototype)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/jobs"
            className={`rounded-md border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-900 hover:border-blue-500' : 'border-slate-200 hover:border-blue-400'}`}
          >
            <div className="flex items-center gap-2 text-blue-500 font-medium">
              <ClipboardList size={16} />
              Open Jobs
            </div>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Start or continue pick tasks for FBM orders.
            </p>
          </Link>
          <div className={`rounded-md border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 text-amber-500 font-medium">
              <PackageCheck size={16} />
              Pack stage
            </div>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Validate picked quantities before shipment.
            </p>
          </div>
          <div className={`rounded-md border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 text-green-500 font-medium">
              <Truck size={16} />
              Confirm shipment
            </div>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Send carrier + tracking details to Amazon for FBM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmazonFulfillment;
