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
              Category
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
                <div className="text-sm text-slate-900">{item.quantity}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">${item.price.toFixed(2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{item.locationCode} - {item.shelfNumber}</div>
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