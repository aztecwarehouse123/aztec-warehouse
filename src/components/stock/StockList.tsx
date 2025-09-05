import React from 'react';
import { StockItem } from '../../types';
import { format } from 'date-fns';

interface StockListProps {
  items: StockItem[];
  onItemClick?: (item: StockItem) => void;
}

const StockList: React.FC<StockListProps> = ({ items, onItemClick }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Item
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Store
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Quantity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Price
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Location
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Last Updated
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {items.map((item) => (
            <tr 
              key={item.id} 
              onClick={() => onItemClick?.(item)}
              className="hover:bg-slate-50 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{item.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {item.storeName && item.storeName !== 'not set' ? (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                    item.storeName === 'supply & serve' ? 'bg-blue-100 text-blue-700' :
                    item.storeName === 'APHY' ? 'bg-green-100 text-green-700' :
                    item.storeName === 'AZTEC' ? 'bg-purple-100 text-purple-700' :
                    item.storeName === 'ZK' ? 'bg-orange-100 text-orange-700' :
                    item.storeName === 'Fahiz' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.storeName?.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{item.quantity}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">${item.price.toFixed(2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{item.locationCode} - {item.shelfNumber}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'active' 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.status === 'active' ? 'Active' : 'Pending'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {format(item.lastUpdated, 'MMM d, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockList; 