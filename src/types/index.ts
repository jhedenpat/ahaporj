export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  telegram_id?: string;
  username?: string;
  items: OrderItem[];
  total: number;
  status: 'paid' | 'unpaid';
  date: string; // ISO string
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface TelegramProfile {
  id: string;         // Telegram user ID
  first_name: string;
  username?: string;
  created_at?: string;
}

export interface Review {
  id: string;
  product_id: string;
  telegram_id: string;
  first_name: string;
  username?: string;
  rating: number;     // 1-5
  comment?: string;
  created_at: string;
}

export interface ProductRequest {
  id: string;
  telegram_id: string;
  first_name: string;
  username?: string;
  product_name: string;
  description?: string;
  quantity: number;
  status: 'pending' | 'noted' | 'declined' | 'completed' | 'archived';
  created_at: string;
}
