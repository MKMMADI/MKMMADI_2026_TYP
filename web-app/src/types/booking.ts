// src/types/booking.ts

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"   // newly added for clerk workflow
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export interface Room {
  id: number;
  name: string;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_SERVICE";
}

export interface Amenity {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  department?: string;
  contactNumber?: string;
}

export interface Booking {
  id: number;
  purpose: string;
  startAt: string;   // ISO date string
  endAt: string;     // ISO date string
  status: BookingStatus;
  employee: Employee;
  rooms: { room: Room }[];       // matches your Prisma relation BookingRoom → Room
  amenities: Amenity[];          // matches BookingAmenity → Amenity
  preparedBy?: Employee | null;  // clerk who prepared
}
