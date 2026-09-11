import type { Amenity, Booking, BookingStatus, Room, RoomStatus, User } from '../types';

/** Placeholder when API rooms have no photo field yet */
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80';

function amenityIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('wifi') || n.includes('wi-fi')) return 'wifi';
  if (n.includes('video') || n.includes('conference') || n.includes('zoom') || n.includes('teams'))
    return 'videocam-outline';
  if (n.includes('display') || n.includes('screen') || n.includes('projector') || n.includes('4k'))
    return 'desktop-outline';
  if (n.includes('white') || n.includes('board') || n.includes('flip')) return 'easel-outline';
  if (n.includes('phone') || n.includes('speaker')) return 'call-outline';
  if (n.includes('coffee') || n.includes('water')) return 'cafe-outline';
  if (n.includes('access')) return 'accessibility-outline';
  return 'ellipse-outline';
}

export function mapAmenity(raw: any): Amenity {
  return {
    id: String(raw.id),
    name: raw.name || 'Amenity',
    description: raw.description ?? undefined,
    icon: amenityIcon(raw.name || ''),
  };
}

export function mapRoom(raw: any): Room {
  const amenitiesRaw = Array.isArray(raw.amenities) ? raw.amenities : [];
  // API may return amenity objects directly or nested under .amenity
  const amenities = amenitiesRaw.map((a: any) => mapAmenity(a.amenity ? a.amenity : a));

  return {
    id: String(raw.id),
    name: raw.name || 'Room',
    description: raw.description || '',
    capacity: Number(raw.capacity) || 0,
    status: (raw.status as RoomStatus) || 'AVAILABLE',
    isActive: raw.isActive !== false,
    imageUrl: raw.imageUrl || PLACEHOLDER_IMAGE,
    amenities,
    floor: raw.floor != null ? String(raw.floor) : undefined,
    location: raw.location || 'Main building',
    rating: raw.rating != null ? Number(raw.rating) : undefined,
    reviewCount: raw.reviewCount != null ? Number(raw.reviewCount) : undefined,
    isFavorite: Boolean(raw.isFavorite),
  };
}

export function mapUser(raw: any): User {
  return {
    id: String(raw.id),
    name: raw.name || 'User',
    email: raw.email || '',
    department: raw.department || '',
    contactNumber: raw.contactNumber || '',
    role: (raw.role as User['role']) || 'EMPLOYEE',
    avatarUrl: raw.avatarUrl,
  };
}

export function mapBooking(raw: any): Booking {
  const rooms = Array.isArray(raw.rooms)
    ? raw.rooms.map((br: any) => {
        const roomRaw = br.room || br;
        return {
          id: String(br.id ?? roomRaw.id),
          roomId: String(br.roomId ?? roomRaw.id),
          room: mapRoom(roomRaw),
          roomStatus: br.roomStatus,
        };
      })
    : [];

  const amenitiesRaw = Array.isArray(raw.amenities) ? raw.amenities : [];
  const requestedAmenities = amenitiesRaw.map((a: any) =>
    mapAmenity(a.amenity ? a.amenity : a)
  );

  return {
    id: String(raw.id),
    employeeId: String(raw.employeeId ?? raw.employee?.id ?? ''),
    startAt: raw.startAt,
    endAt: raw.endAt,
    purpose: raw.purpose || 'Meeting',
    status: (raw.status as BookingStatus) || 'PENDING',
    createdAt: raw.createdAt || raw.startAt,
    rooms,
    requestedAmenities,
  };
}

/** Body shape expected by POST /api/v1/bookings */
export function toCreateBookingBody(payload: {
  purpose: string;
  startAt: string;
  endAt: string;
  roomIds: string[] | number[];
  amenityIds: string[] | number[];
  capacity: number;
}) {
  return {
    purpose: payload.purpose,
    startAt: payload.startAt,
    endAt: payload.endAt,
    roomIds: payload.roomIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)),
    amenityIds: payload.amenityIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)),
    capacity: Number(payload.capacity) || 0,
  };
}
