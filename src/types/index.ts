export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  password?: string;
};

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  supplier: string | null;
  lastUpdated: Date;
  locationCode: string;
  shelfNumber: string;
  barcode: string | null;
  asin: string | null; // Amazon Standard Identification Number
  status: 'pending' | 'active'; // Status of the stock item
  damagedItems: number; // Number of damaged items
  fulfillmentType: 'fba' | 'mf'; // Fulfillment type: FBA (Fulfilled by Amazon) or MF (Merchant Fulfilled)
  storeName: string; // Store name where the item is from
}

// export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed';

// export type Order = {
//   id: string;
//   orderNumber: string;
//   customerName: string;
//   items: OrderItem[];
//   status: OrderStatus;
//   createdAt: Date;
//   updatedAt: Date;
//   shippingAddress: Address;
//   billingAddress: Address;
//   paymentMethod: string;
//   totalAmount: number;
//   notes?: string;
//   shippedTime?: Date | null; // Optional field for shipped date/time, can be null to signal deletion
// };

// export type OrderItem = {
//   id: string;
//   productId: string;
//   productName: string;
//   quantity: number;
//   unitPrice: number;
//   totalPrice: number;
// };

// export type Address = {
//   street: string;
//   city: string;
//   state: string;
//   zipCode: string;
//   country: string;
// };

// export type ChartData = {
//   name: string;
//   value: number;
// };

// export type SalesData = {
//   date: string;
//   amount: number;
// };

// export type TopProduct = {
//   id: string;
//   name: string;
//   quantity: number;
//   revenue: number;
//   image?: string;
// };

// export type StockCategory = 'electronics' | 'clothing' | 'furniture' | 'food' | 'other';

export type ActivityLog = {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
};