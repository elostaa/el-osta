
export type UserRole = 'customer' | 'technician' | 'admin' | 'manager';

export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  address?: string;
  securityQuestion: string;
  securityAnswer: string;
  role: UserRole;
  specialty?: string; // For technicians
  experience?: number; // For technicians
  area?: string; // For technicians
  createdAt: number;
  isApproved?: boolean; // حقل الاعتماد
  isVIP?: boolean; // حقل التميز للعملاء
  isSuspended?: boolean; // حقل الإيقاف المؤقت
  favoriteTechIds?: string[]; // قائمة الفنيين المفضلين للعميل
  averageRating?: number; // متوسط التقييم للفني
  ratingCount?: number; // عدد التقييمات للفني
}

export type OrderStatus = 'pending' | 'assigned' | 'completed' | 'failed';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  detailedLocation?: string;
  serviceType: string;
  description?: string;
  preferredTiming?: string;
  specificTime?: string;
  status: OrderStatus;
  technicianId?: string;
  technicianName?: string;
  technicianSpecialty?: string;
  technicianPhone?: string;
  failureReason?: string; // الملاحظات في حال حدوث خطأ
  adminResolved?: boolean; // هل قام المدير بمراجعة الخطأ؟
  createdAt: number;
  rating?: number;
  feedback?: string;
  isDirect?: boolean; // هل هو طلب مباشر من قائمة المفضلين؟
  isEmergency?: boolean; // هل هو طلب طوارئ؟
  paymentMethod?: 'instapay_orange' | 'vodafone_cash';
  paymentConfirmed?: boolean;
  paymentStatus?: 'pending' | 'confirmed';
  imageUrl?: string; // رابط صورة العطل من Cloudinary
  orderNumber?: number; // رقم الطلب البسيط والفريد للعرض البصري
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface AdminLoginLog {
  id: string;
  adminName: string;
  role: 'admin' | 'manager';
  timestamp: number;
  ip?: string;
}
