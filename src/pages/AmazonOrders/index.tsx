import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AmazonNotificationSettings from '../../components/amazon/AmazonNotificationSettings';

type OrderTab = 'pending' | 'unshipped' | 'shipped' | 'cancelled';

type AmazonOrder = {
  id: string;
  status: OrderTab;
  purchaseDate: string;
  fulfillmentChannel: 'FBA' | 'FBM';
  buyerName: string;
  shippingMethod: string;
  items: Array<{ title: string; asin: string; sku: string; quantity: number }>;
};

const tabs: OrderTab[] = ['pending', 'unshipped', 'shipped', 'cancelled'];

const demoOrders: AmazonOrder[] = [
  {
    id: 'AMZ-112233',
    status: 'pending',
    purchaseDate: '2026-05-06 13:20',
    fulfillmentChannel: 'FBM',
    buyerName: 'John Carter',
    shippingMethod: 'Standard',
    items: [{ title: 'Wireless Earbuds', asin: 'B0ABC12345', sku: 'EARBUDS-01', quantity: 2 }],
  },
  {
    id: 'AMZ-112244',
    status: 'unshipped',
    purchaseDate: '2026-05-06 10:05',
    fulfillmentChannel: 'FBM',
    buyerName: 'Sara Malik',
    shippingMethod: 'Expedited',
    items: [{ title: 'Protein Bars', asin: 'B0XYZ67890', sku: 'PROBAR-10', quantity: 8 }],
  },
  {
    id: 'AMZ-112255',
    status: 'shipped',
    purchaseDate: '2026-05-05 16:49',
    fulfillmentChannel: 'FBA',
    buyerName: 'Andre Lee',
    shippingMethod: 'Prime',
    items: [{ title: 'Smartphone Case', asin: 'B0QWE56789', sku: 'CASE-02', quantity: 1 }],
  },
  {
    id: 'AMZ-112266',
    status: 'cancelled',
    purchaseDate: '2026-05-04 18:01',
    fulfillmentChannel: 'FBM',
    buyerName: 'Ivy Chen',
    shippingMethod: 'Standard',
    items: [{ title: 'Laptop Backpack', asin: 'B0RTY65432', sku: 'BAG-03', quantity: 1 }],
  },
];

const AmazonOrders: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<OrderTab>('pending');
  const [selectedOrder, setSelectedOrder] = useState<AmazonOrder | null>(null);

  const filteredOrders = useMemo(
    () => demoOrders.filter((order) => order.status === activeTab),
    [activeTab]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Amazon Orders</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Orders module with tabbed status view and complete order details.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}>
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Order ID</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Purchase Date</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Fulfillment</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Buyer</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Action</th>
            </tr>
          </thead>
          <tbody className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
            {filteredOrders.map((order) => (
              <tr key={order.id} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.id}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.purchaseDate}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.fulfillmentChannel}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.buyerName}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className={`px-4 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  No orders found in this tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className={`rounded-lg border p-5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Order details: {selectedOrder.id}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className={`text-sm ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status: {selectedOrder.status}</p>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Buyer: {selectedOrder.buyerName}</p>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Shipping method: {selectedOrder.shippingMethod}
              </p>
            </div>
            <div>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Fulfillment channel: {selectedOrder.fulfillmentChannel}
              </p>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                Purchase date: {selectedOrder.purchaseDate}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Items list</h3>
            <div className="space-y-2">
              {selectedOrder.items.map((item) => (
                <div
                  key={`${selectedOrder.id}-${item.asin}`}
                  className={`rounded-md px-3 py-2 text-sm ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
                >
                  <p className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{item.title}</p>
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    ASIN: {item.asin} | SKU: {item.sku} | Qty: {item.quantity}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AmazonNotificationSettings />
    </div>
  );
};

export default AmazonOrders;
