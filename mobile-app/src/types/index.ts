export type Role = 'EMPLOYEE' | 'CLERK' | 'MANAGER';

export type RoomStatus = 'AVAILABLE' | 'OUT_OF_SERVICE' | 'MAINTENANCE';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Amenity {
  id: string;
  name: string;
  icon: string; // Ionicons name
  description?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  status: RoomStatus;
  isActive: boolean;
  imageUrl: string;
  amenities: Amenity[];
  floor?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  contactNumber: string;
  role: Role;
  avatarUrl?: string;
}

export interface BookingRoom {
  id: string;
  roomId: string;
  room: Room;
  roomStatus?: string;
  roomAmenitiesLoaded?: boolean;
}

export interface Booking {
  id: string;
  employeeId: string;
  employeeName?: string;
  startAt: string; // ISO
  endAt: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  rooms: BookingRoom[];
  requestedAmenities: Amenity[];
}

export interface ConversationParticipant {
  id: number;
  name: string;
  role: Role;
}

export interface DirectMessage {
  id: number;
  conversationId: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  sender: ConversationParticipant;
  recipient: ConversationParticipant;
}

export interface ConversationSummary {
  id: number;
  participant: ConversationParticipant;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: DirectMessage | null;
}

export interface SearchFilters {
  startAt: Date | null;
  endAt: Date | null;
  capacity: number;
  amenityIds: string[];
}
