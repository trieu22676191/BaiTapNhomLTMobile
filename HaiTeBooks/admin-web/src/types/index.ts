export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  enabled: boolean;
  role: {
    id: number;
    name: string;
  };
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
  userPhone?: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  paymentMethod?: string;
  shippingAddress?: string;
  note?: string;
  items?: OrderItem[];
  appliedPromotion?: {
    id: number;
    code: string;
    discountPercent: number;
    name: string;
    maxDiscountAmount?: number | null;
  };
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
  lowStockBooksList?: Array<{
    id: number;
    title: string;
    stock: number;
    categoryName?: string;
  }>;
}

export interface Promotion {
  id: number;
  name: string;
  code: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  quantity: number;
  minimumOrderAmount?: number | null; // Giá trị đơn hàng tối thiểu (VND)
  maxDiscountAmount?: number | null; // Giảm tối đa bao nhiêu tiền (VND)
  isActive: boolean;
  createdByUserId?: number;
  approvedByUserId?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'deactivated';
  createdAt?: string;
}

