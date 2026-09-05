export const REJECTION_REASONS = [
  { code: 'ROOM_UNAVAILABLE', label: 'Room unavailable / double-booked' },
  { code: 'INSUFFICIENT_CAPACITY', label: 'Insufficient capacity' },
  { code: 'AMENITIES_UNAVAILABLE', label: 'Amenities not available' },
  { code: 'OUTSIDE_WINDOW', label: 'Outside allowed booking window' },
  { code: 'PRIORITY_CONFLICT', label: 'Conflicts with priority event' },
  { code: 'INCOMPLETE_REQUEST', label: 'Incomplete request details' },
  { code: 'POLICY_RESTRICTION', label: 'Policy / department restriction' },
  { code: 'OTHER', label: 'Other' },
] as const;

export type RejectionReasonCode = (typeof REJECTION_REASONS)[number]['code'];

export function isValidRejectionCode(code: string): code is RejectionReasonCode {
  return REJECTION_REASONS.some((r) => r.code === code);
}
