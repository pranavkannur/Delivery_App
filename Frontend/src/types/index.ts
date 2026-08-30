export type Role = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export type VehicleType = 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  driver?: {
    id: string;
    vehicleType: VehicleType;
    licensePlate?: string;
    isAvailable: boolean;
  };
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  driverId?: string | null;
  status: OrderStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  totalAmount: number;
  items: OrderItem[];
  deliveryOtp?: string; // Visible only to customer who created it
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
    phone?: string;
  };
  driver?: {
    id: string;
    vehicleType: VehicleType;
    licensePlate?: string;
    user: {
      name: string;
      phone?: string;
    };
  };
}