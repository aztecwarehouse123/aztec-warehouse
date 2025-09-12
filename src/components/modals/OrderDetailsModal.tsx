import React from 'react';
import { Order } from '../../types';
import Modal from './Modal';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!order) return null;
  

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order ${order.orderNumber}`}
      size="xl"
    >
      <div className="space-y-2">
        {/* Status, Customer Info, Dates */}
        <div className="flex flex-wrap justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-medium text-slate-500">Status</h4>
            <div className="mt-1">
              <StatusBadge status={order.status} />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-slate-500">Customer</h4>
            <p className="text-slate-800 font-medium">{order.customerName}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-slate-500">Order Date</h4>
            <p className="text-slate-800">
              {order.createdAt ? format(order.createdAt, 'MMM d, yyyy h:mm a') : 'N/A'}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-slate-500">Last Updated</h4>
            <p className="text-slate-800">
              {order.updatedAt ? format(order.updatedAt, 'MMM d, yyyy h:mm a') : 'N/A'}
            </p>
          </div>

          {/* Shipped Time (conditional) */}
          {order.status === 'shipped' && order.shippedTime && (
            <div>
              <h4 className="text-sm font-medium text-slate-500">Shipped Time</h4>
              <p className="text-slate-800">
                {order.shippedTime ? format(order.shippedTime as Date, 'MMM d, yyyy h:mm a') : 'N/A'}
              </p>
            </div>
          )}
        </div>
        
        {/* Order Items */}
        <div>
          <h4 className="font-medium text-slate-800 mb-3">Order Items</h4>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-right">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-700 text-right">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                    ${order.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {/* Shipping and Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Shipping Address</h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-800">{order.shippingAddress.street}</p>
              <p className="text-sm text-slate-800">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p className="text-sm text-slate-800">{order.shippingAddress.country}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Billing Address</h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-800">{order.billingAddress.street}</p>
              <p className="text-sm text-slate-800">
                {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zipCode}
              </p>
              <p className="text-sm text-slate-800">{order.billingAddress.country}</p>
            </div>
          </div>
        </div>
        
        {/* Payment Method and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Payment Method</h4>
            <p className="text-slate-700">{order.paymentMethod}</p>
          </div>
          
          {order.notes && (
            <div>
              <h4 className="font-medium text-slate-800 mb-2">Notes</h4>
              <p className="text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;