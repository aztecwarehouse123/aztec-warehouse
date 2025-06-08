import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Order, OrderItem, Address, OrderStatus, StockItem } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { stockItems as mockStockItems } from '../../utils/mockData';
import { format } from 'date-fns';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (order: Omit<Order, 'id'>) => void;
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' }
];

const paymentOptions = [
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash', label: 'Cash' }
];

const emptyOrderItem: Omit<OrderItem, 'id'> = {
  productId: '',
  productName: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0
};

const emptyAddress: Address = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: ''
};

function generateOrderNumber() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${date}-${time}-${rand}`;
}

const isAddress = (addr: unknown): addr is Address => {
  return (
    typeof addr === 'object' &&
    addr !== null &&
    !Array.isArray(addr) &&
    'street' in addr &&
    'city' in addr &&
    'state' in addr &&
    'zipCode' in addr &&
    'country' in addr
  );
};

const safeAddress = (addr: unknown): Address => {
  if (!isAddress(addr)) {
    return { street: '', city: '', state: '', zipCode: '', country: '' };
  }
  return addr;
};

const AddOrderModal: React.FC<AddOrderModalProps> = ({ isOpen, onClose, onAdd, isLoading }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [createdAt, setCreatedAt] = useState('');
  const [items, setItems] = useState([ { ...emptyOrderItem } ]);
  const [shippingAddress, setShippingAddress] = useState({ ...emptyAddress });
  const [billingAddress, setBillingAddress] = useState({ ...emptyAddress });
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<StockItem[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  // Generate order number on open
  useEffect(() => {
    if (isOpen) {
      setOrderNumber(generateOrderNumber());
      // Set createdAt to current date in yyyy-MM-dd format
      setCreatedAt(format(new Date(), 'yyyy-MM-dd'));
      // Reset items to one empty item with no product selected
      setItems([{ ...emptyOrderItem }]);
      // Reset status to pending on open
      setStatus('pending');
    }
  }, [isOpen]);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const q = query(collection(db, 'inventory'), orderBy('name'));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as StockItem[];
        setProducts(products.length > 0 ? products : mockStockItems);
      } catch {
        setProducts(mockStockItems);
      } finally {
        setIsProductsLoading(false);
      }
    };
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const handleItemChange = (idx: number, field: keyof Omit<OrderItem, 'id'>, value: string | number) => {
    setItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'productName') {
        const product = products.find(p => p.name === value);
        if (product) {
          return {
            ...item,
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: 1,
            totalPrice: product.price * 1
          };
        }
        return item;
      }
      if (field === 'quantity') {
        const quantity = Number(value);
        return {
          ...item,
          quantity,
          totalPrice: item.unitPrice * quantity
        };
      }
      return { ...item, [field]: value };
    }));
  };

  const handleAddItem = () => {
    setItems([...items, { ...emptyOrderItem }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items => items.filter((_, i) => i !== idx));
  };

  const handleAddressChange = (type: 'shipping' | 'billing', field: keyof Address, value: string) => {
    if (type === 'shipping') setShippingAddress(addr => ({ ...safeAddress(addr), [field]: value }));
    else setBillingAddress(addr => ({ ...safeAddress(addr), [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(item => !item.productId || !item.productName)) {
      alert('Please select a product for each order item.');
      return;
    }
    const now = new Date();
    const order: Omit<Order, 'id'> = {
      orderNumber,
      customerName,
      status,
      createdAt: createdAt ? new Date(createdAt) : now,
      updatedAt: now,
      items: items.map((item, idx) => ({ ...item, id: `item${idx + 1}` })),
      shippingAddress,
      billingAddress,
      paymentMethod,
      totalAmount: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    };
    if (notes) order.notes = notes;
    onAdd(order);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Order" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Order Number" value={orderNumber} readOnly required fullWidth />
          <Input label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} required fullWidth />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value as OrderStatus)} options={statusOptions} required fullWidth disabled />
          <Select label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} options={paymentOptions} required fullWidth />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Order Date" type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} required fullWidth />
        </div>
        <div>
          <h4 className="font-medium text-slate-800 mb-2">Order Items</h4>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 items-end">
              <Select
                label="Product Name"
                value={item.productName}
                onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                options={[
                  { value: '', label: 'Select product...' },
                  ...products.map(p => ({ value: p.name, label: p.name }))
                ]}
                required
                fullWidth
                disabled={isProductsLoading}
              />
              <Input
                label="Quantity"
                type="number"
                value={item.quantity}
                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                min={1}
                required
                fullWidth
                disabled={!item.productName}
              />
              <Input
                label="Unit Price"
                type="number"
                value={item.unitPrice}
                disabled
                fullWidth
              />
              <Input
                label="Total Price"
                type="number"
                value={item.totalPrice}
                disabled
                fullWidth
              />
              <Button type="button" variant="danger" size="sm" icon={<Trash2 size={16} />} onClick={() => handleRemoveItem(idx)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="primary" icon={<Plus size={16} />} onClick={handleAddItem} disabled={isProductsLoading}>
            Add Item
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Shipping Address</h4>
            <Input label="Street" value={shippingAddress.street} onChange={e => handleAddressChange('shipping', 'street', e.target.value)} required fullWidth />
            <Input label="City" value={shippingAddress.city} onChange={e => handleAddressChange('shipping', 'city', e.target.value)} required fullWidth />
            <Input label="State" value={shippingAddress.state} onChange={e => handleAddressChange('shipping', 'state', e.target.value)} required fullWidth />
            <Input label="Zip Code" value={shippingAddress.zipCode} onChange={e => handleAddressChange('shipping', 'zipCode', e.target.value)} required fullWidth />
            <Input label="Country" value={shippingAddress.country} onChange={e => handleAddressChange('shipping', 'country', e.target.value)} required fullWidth />
          </div>
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Billing Address</h4>
            <Input label="Street" value={billingAddress.street} onChange={e => handleAddressChange('billing', 'street', e.target.value)} required fullWidth />
            <Input label="City" value={billingAddress.city} onChange={e => handleAddressChange('billing', 'city', e.target.value)} required fullWidth />
            <Input label="State" value={billingAddress.state} onChange={e => handleAddressChange('billing', 'state', e.target.value)} required fullWidth />
            <Input label="Zip Code" value={billingAddress.zipCode} onChange={e => handleAddressChange('billing', 'zipCode', e.target.value)} required fullWidth />
            <Input label="Country" value={billingAddress.country} onChange={e => handleAddressChange('billing', 'country', e.target.value)} required fullWidth />
          </div>
        </div>
        <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} fullWidth />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} variant="primary">Add Order</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddOrderModal; 