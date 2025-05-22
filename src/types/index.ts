export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'inbound' | 'outbound';
  password: string;
};

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  supplier: string;
  lastUpdated: Date;
  locationCode: string;
  shelfNumber: string;
  threshold: number; // Minimum quantity threshold for low stock alerts
  barcode?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  totalAmount: number;
  notes?: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type ChartData = {
  name: string;
  value: number;
};

export type SalesData = {
  date: string;
  amount: number;
};

export type TopProduct = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  image?: string;
};

export type StockCategory = 'electronics' | 'clothing' | 'furniture' | 'food' | 'other';

export type ActivityLog = {
  id: string;
  user: string;
  action: string;
  timestamp: Date;
  details: string;
};