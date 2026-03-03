export type Role = 'Admin' | 'Manager' | 'Member';
export type Country = 'India' | 'America';
export type OrderStatus = 'Pending' | 'Paid' | 'Cancelled';

export interface User {
  id: number;
  email: string;
  role: Role;
  country: Country;
}

export interface Restaurant {
  id: number;
  name: string;
  country: Country;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  user_email?: string;
}

export interface PaymentMethod {
  id: number;
  user_id: number;
  type: string;
  details: string;
}
