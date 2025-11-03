export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  role_id: 'user' | 'admin';
  createdAt?: string;
}

export interface Book {
  id: number;
  title: string;
  author?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  categoryId?: number;
  categoryName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  bookCount?: number;
}

export interface Order {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  paymentMethod?: string;
  shippingAddress?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  bookId: number;
  bookTitle: string;
  quantity: number;
  price: number;
}

export interface Review {
  id: number;
  bookId: number;
  bookTitle?: string;
  userId: number;
  userName?: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalBooks: number;
  pendingOrders: number;
  lowStockBooks: number;
  recentOrders?: Order[];
  topSellingBooks?: Array<{
    bookId: number;
    bookTitle: string;
    totalSold: number;
    revenue: number;
  }>;
}

