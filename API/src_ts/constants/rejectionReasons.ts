/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines rejection reasons constants and related validation data.
 */

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

/**
 * Reports whether valid rejection code.
 * @param code Rejection reason code to check against the supported reason list.
 * @returns True when the supplied value satisfies the function condition; otherwise false.
 */
export function isValidRejectionCode(code: string): code is RejectionReasonCode {
  return REJECTION_REASONS.some((r) => r.code === code);
}
