import { StockItem, Order, User, TopProduct, SalesData, ActivityLog } from '../types';
import { subDays, format } from 'date-fns';

// Mock current user
export const users : User[] = [
  {
    id: 'user1',
    username: 'admin',
    email: 'admin@warehouse.com',
    name: 'Admin User',
    role: 'admin',
    password: '',
  },
  {
    id: 'user2',
    username: 'inbound',
    email: 'inbound@warehouse.com',
    name: 'Inbound Staff',
    role: 'inbound',
    password: '',
  },
  {
    id: 'user3',
    username: 'outbound',
    email: 'outbound@warehouse.com',
    name: 'Outbound Staff',
    role: 'outbound',
    password: '',
  },
  {
    id: 'user4',
    username: 'fahiz',
    email: 'fahiz@warehouse.com',
    name: 'Fahiz',
    role: 'fahiz',
    password: '',
  },
  {
    id: 'user5',
    username: 'aphy',
    email: 'aphy@warehouse.com',
    name: 'APHY',
    role: 'aphy',
    password: '',
  }
];

// Mock stock items
export const stockItems: StockItem[] = [
  {
    id: 'stock1',
    name: 'Wireless Earbuds',
    quantity: 150,
    price: 89.99,
    supplier: 'Tech Supplies Inc.',
    lastUpdated: new Date(),
    locationCode: 'A1',
    shelfNumber: 3,
  },
  {
    id: 'stock2',
    name: 'Premium T-Shirt',
    quantity: 300,
    price: 24.99,
    supplier: 'Fashion Forward',
    lastUpdated: subDays(new Date(), 2),
    locationCode: 'A2',
    shelfNumber: 1,
  },
  {
    id: 'stock3',
    name: 'Office Chair',
    quantity: 45,
    price: 149.99,
    supplier: 'Office Comfort LLC',
    lastUpdated: subDays(new Date(), 5),
    locationCode: 'B1',
    shelfNumber: 2,
  },
  {
    id: 'stock4',
    name: 'Smartphone Case',
    quantity: 200,
    price: 19.99,
    supplier: 'Tech Accessories Co.',
    lastUpdated: subDays(new Date(), 1),
    locationCode: 'B2',
    shelfNumber: 4,
  },
  {
    id: 'stock5',
    name: 'Protein Bars',
    quantity: 500,
    price: 2.99,
    supplier: 'Nutrition Wholesale',
    lastUpdated: subDays(new Date(), 3),
    locationCode: 'C1',
    shelfNumber: 2,
  },
  {
    id: 'stock6',
    name: 'Laptop Backpack',
    quantity: 75,
    price: 59.99,
    supplier: 'Travel Gear Ltd.',
    lastUpdated: subDays(new Date(), 7),
    locationCode: 'C2',
    shelfNumber: 3,
  },
  {
    id: 'stock7',
    name: 'Wireless Mouse',
    quantity: 120,
    price: 29.99,
    supplier: 'Tech Supplies Inc.',
    lastUpdated: subDays(new Date(), 4),
    locationCode: 'D1',
    shelfNumber: 2,
  },
  {
    id: 'stock8',
    name: 'Denim Jeans',
    quantity: 180,
    price: 49.99,
    supplier: 'Fashion Forward',
    lastUpdated: subDays(new Date(), 6),
    locationCode: 'D2',
    shelfNumber: 4,
  }
];

// Mock orders
export const orders: Order[] = [
  {
    id: 'order1',
    orderNumber: 'ORD-2025-001',
    customerName: 'Jane Smith',
    items: [
      {
        id: 'item1',
        productId: 'stock1',
        productName: 'Wireless Earbuds',
        quantity: 2,
        unitPrice: 89.99,
        totalPrice: 179.98
      },
      {
        id: 'item2',
        productId: 'stock4',
        productName: 'Smartphone Case',
        quantity: 1,
        unitPrice: 19.99,
        totalPrice: 19.99
      }
    ],
    status: 'pending',
    createdAt: subDays(new Date(), 1),
    updatedAt: subDays(new Date(), 1),
    shippingAddress: {
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02108',
      country: 'USA'
    },
    billingAddress: {
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02108',
      country: 'USA'
    },
    paymentMethod: 'Credit Card',
    totalAmount: 199.97
  },
  {
    id: 'order2',
    orderNumber: 'ORD-2025-002',
    customerName: 'John Doe',
    items: [
      {
        id: 'item3',
        productId: 'stock3',
        productName: 'Office Chair',
        quantity: 1,
        unitPrice: 149.99,
        totalPrice: 149.99
      }
    ],
    status: 'processing',
    createdAt: subDays(new Date(), 2),
    updatedAt: subDays(new Date(), 1),
    shippingAddress: {
      street: '456 Park Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10022',
      country: 'USA'
    },
    billingAddress: {
      street: '456 Park Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10022',
      country: 'USA'
    },
    paymentMethod: 'PayPal',
    totalAmount: 149.99
  },
  {
    id: 'order3',
    orderNumber: 'ORD-2025-003',
    customerName: 'Bob Johnson',
    items: [
      {
        id: 'item4',
        productId: 'stock2',
        productName: 'Premium T-Shirt',
        quantity: 3,
        unitPrice: 24.99,
        totalPrice: 74.97
      },
      {
        id: 'item5',
        productId: 'stock8',
        productName: 'Denim Jeans',
        quantity: 2,
        unitPrice: 49.99,
        totalPrice: 99.98
      }
    ],
    status: 'shipped',
    createdAt: subDays(new Date(), 5),
    updatedAt: subDays(new Date(), 3),
    shippingAddress: {
      street: '789 Oak Dr',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    billingAddress: {
      street: '789 Oak Dr',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    paymentMethod: 'Credit Card',
    totalAmount: 174.95
  },
  {
    id: 'order4',
    orderNumber: 'ORD-2025-004',
    customerName: 'Alice Williams',
    items: [
      {
        id: 'item6',
        productId: 'stock5',
        productName: 'Protein Bars',
        quantity: 10,
        unitPrice: 2.99,
        totalPrice: 29.90
      }
    ],
    status: 'delivered',
    createdAt: subDays(new Date(), 10),
    updatedAt: subDays(new Date(), 7),
    shippingAddress: {
      street: '101 Pine St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94111',
      country: 'USA'
    },
    billingAddress: {
      street: '101 Pine St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94111',
      country: 'USA'
    },
    paymentMethod: 'Credit Card',
    totalAmount: 29.90
  },
  {
    id: 'order5',
    orderNumber: 'ORD-2025-005',
    customerName: 'Thomas Clark',
    items: [
      {
        id: 'item7',
        productId: 'stock7',
        productName: 'Wireless Mouse',
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99
      },
      {
        id: 'item8',
        productId: 'stock6',
        productName: 'Laptop Backpack',
        quantity: 1,
        unitPrice: 59.99,
        totalPrice: 59.99
      }
    ],
    status: 'delivered',
    createdAt: subDays(new Date(), 15),
    updatedAt: subDays(new Date(), 12),
    shippingAddress: {
      street: '202 Maple Rd',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      country: 'USA'
    },
    billingAddress: {
      street: '202 Maple Rd',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      country: 'USA'
    },
    paymentMethod: 'PayPal',
    totalAmount: 89.98
  }
];

// Completed orders
export const completedOrders = orders.filter(order => 
  order.status === 'delivered' || order.status === 'cancelled'
);

// Top selling products
export const topProducts: TopProduct[] = [
  {
    id: 'stock1',
    name: 'Wireless Earbuds',
    quantity: 120,
    revenue: 10798.80,
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=300'
  },
  {
    id: 'stock5',
    name: 'Protein Bars',
    quantity: 350,
    revenue: 1046.50,
    image: 'https://images.pexels.com/photos/8105063/pexels-photo-8105063.jpeg?auto=compress&cs=tinysrgb&w=300'
  },
  {
    id: 'stock2',
    name: 'Premium T-Shirt',
    quantity: 200,
    revenue: 4998.00,
    image: 'https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=300'
  },
  {
    id: 'stock7',
    name: 'Wireless Mouse',
    quantity: 85,
    revenue: 2549.15,
    image: 'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=300'
  }
];

// Last 30 days sales data
export const salesData: SalesData[] = Array.from({ length: 30 }, (_, i) => {
  // Generate random sales between 2000 and 8000
  const amount = Math.floor(Math.random() * 6000) + 2000;
  return {
    date: format(subDays(new Date(), 29 - i), 'MMM dd'),
    amount
  };
});

// Recent activity logs
export const activityLogs: ActivityLog[] = [
  {
    id: 'log1',
    user: 'Admin User',
    action: 'Added new stock',
    timestamp: subDays(new Date(), 1),
    details: 'Added 50 units of Wireless Earbuds'
  },
  {
    id: 'log2',
    user: 'Admin User',
    action: 'Updated order status',
    timestamp: subDays(new Date(), 1),
    details: 'Order #ORD-2025-002 marked as processing'
  },
  {
    id: 'log3',
    user: 'John Manager',
    action: 'Shipped order',
    timestamp: subDays(new Date(), 3),
    details: 'Order #ORD-2025-003 has been shipped'
  },
  {
    id: 'log4',
    user: 'Sarah Staff',
    action: 'Updated stock',
    timestamp: subDays(new Date(), 4),
    details: 'Reduced Denim Jeans stock by 5 units'
  },
  {
    id: 'log5',
    user: 'Admin User',
    action: 'Created new order',
    timestamp: subDays(new Date(), 5),
    details: 'Created order #ORD-2025-005 for Thomas Clark'
  }
];