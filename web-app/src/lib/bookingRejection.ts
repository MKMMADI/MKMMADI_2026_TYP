export interface RejectionReason {
  code: string;
  label: string;
}

export const FALLBACK_REASONS: RejectionReason[] = [
  { code: "ROOM_UNAVAILABLE", label: "Room unavailable / double-booked" },
  { code: "INSUFFICIENT_CAPACITY", label: "Insufficient capacity" },
  { code: "AMENITIES_UNAVAILABLE", label: "Amenities not available" },
  { code: "OUTSIDE_WINDOW", label: "Outside allowed booking window" },
  { code: "PRIORITY_CONFLICT", label: "Conflicts with priority event" },
  { code: "INCOMPLETE_REQUEST", label: "Incomplete request details" },
  { code: "POLICY_RESTRICTION", label: "Policy / department restriction" },
  { code: "OTHER", label: "Other" },
];
