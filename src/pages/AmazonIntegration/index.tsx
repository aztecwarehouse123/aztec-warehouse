import React from 'react';
import { Link } from 'react-router-dom';
import { PlugZap, RefreshCcw, Package, Boxes, ListChecks, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import AmazonNotificationSettings from '../../components/amazon/AmazonNotificationSettings';

const AmazonIntegration: React.FC = () => {
  const { isDarkMode } = useTheme();

  const cards = [
    {
      title: 'Amazon Orders',
      description: 'Manage pending, unshipped, shipped, and cancelled orders.',
      to: '/amazon/orders',
      icon: <Package size={18} />,
    },
    {
      title: 'Amazon Fulfillment',
      description: 'Handle FBM pick, pack, and shipment confirmation workflow.',
      to: '/amazon/fulfillment',
      icon: <ListChecks size={18} />,
    },
    {
      title: 'ASIN / SKU Mapping',
      description: 'Map Amazon ASIN and Seller SKU with WMS inventory records.',
      to: '/amazon/mapping',
      icon: <Boxes size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Amazon Integration
        </h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Integration hub for account connection, sync visibility, and Amazon operations.
        </p>
      </div>

      <div className={`rounded-lg border p-5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Connection</p>
            <p className="inline-flex items-center gap-2 text-sm px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500">
              <PlugZap size={16} />
              Setup required
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Connect your Amazon seller account from backend OAuth before enabling live sync.
            </p>
          </div>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <RefreshCcw size={16} />
            Refresh status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Orders sync</p>
          <p className={`text-lg font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Every 5-10 min</p>
        </div>
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Inventory sync</p>
          <p className={`text-lg font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Every 30-60 min</p>
        </div>
        <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Notifications API</p>
          <p className={`text-lg font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Planned</p>
        </div>
      </div>

      <AmazonNotificationSettings />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`rounded-lg border p-5 transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 hover:border-blue-500'
                : 'bg-white border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {card.icon}
                <span className="font-medium">{card.title}</span>
              </div>
              <ArrowRight size={16} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
            </div>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AmazonIntegration;
