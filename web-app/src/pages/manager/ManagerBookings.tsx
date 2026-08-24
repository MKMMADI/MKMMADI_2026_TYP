import { useState, useEffect, useMemo } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-bookings.css";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

interface ApiBooking {
  id: number;
  purpose: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  employee: { id: number; name: string; email: string };
  rooms: { room: { id: number; name: string; capacity: number } }[];
  amenities?: { amenity: { id: number; name: string } }[];
}

interface RejectionReason {
  code: string;
  label: string;
}

/** Fixed list used by the UI. Later swap for GET /bookings/rejection-reasons */
const REJECTION_REASONS: RejectionReason[] = [
  { code: "ROOM_UNAVAILABLE", label: "Room unavailable / double-booked" },
  { code: "INSUFFICIENT_CAPACITY", label: "Insufficient capacity" },
  { code: "AMENITIES_UNAVAILABLE", label: "Amenities not available" },
  { code: "OUTSIDE_WINDOW", label: "Outside allowed booking window" },
  { code: "PRIORITY_CONFLICT", label: "Conflicts with priority event" },
  { code: "INCOMPLETE_REQUEST", label: "Incomplete request details" },
  { code: "POLICY_RESTRICTION", label: "Policy / department restriction" },
  { code: "OTHER", label: "Other" },
];

const STATUS_FILTERS: { value: "ALL" | BookingStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const dateOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString("en-ZA", dateOpts);
  const timePart = `${start.toLocaleTimeString("en-ZA", timeOpts)} – ${end.toLocaleTimeString("en-ZA", timeOpts)}`;
  return sameDay ? `${datePart} · ${timePart}` : `${datePart} ${timePart}`;
}

function statusLabel(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY: "Ready",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

function statusClass(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PREPARING: "preparing",
    READY: "ready",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  };
  return map[status] || "pending";
}

export default function ManagerBookings() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | BookingStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<ApiBooking | null>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  async function loadBookings() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiBooking[]>("/bookings");
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (!q) return true;
      const rooms = b.rooms.map((r) => r.room.name).join(" ").toLowerCase();
      return (
        b.purpose.toLowerCase().includes(q) ||
        b.employee.name.toLowerCase().includes(q) ||
        b.employee.email.toLowerCase().includes(q) ||
        rooms.includes(q)
      );
    });
  }, [bookings, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      pending: bookings.filter((b) => b.status === "PENDING").length,
      confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
      cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
      total: bookings.length,
    };
  }, [bookings]);

  async function handleApprove(booking: ApiBooking) {
    if (actionId) return;
    setActionId(booking.id);
    try {
      // Uses existing PATCH /bookings/:id/status
      const updated = await apiFetch<ApiBooking>(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, ...updated, status: "CONFIRMED" } : b)));
      setToast(`Booking approved. ${booking.employee.name} will be notified.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not approve booking");
    } finally {
      setActionId(null);
    }
  }

  function openReject(booking: ApiBooking) {
    setRejectTarget(booking);
    setReasonCode("");
    setRejectNote("");
    setRejectError(null);
  }

  function closeReject() {
    setRejectTarget(null);
    setReasonCode("");
    setRejectNote("");
    setRejectError(null);
  }

  async function submitReject() {
    if (!rejectTarget) return;
    if (!reasonCode) {
      setRejectError("Please select a reason.");
      return;
    }
    if (reasonCode === "OTHER" && !rejectNote.trim()) {
      setRejectError("Please add a short note when choosing Other.");
      return;
    }

    setActionId(rejectTarget.id);
    setRejectError(null);

    try {
      // Prefer dedicated reject endpoint when available; fall back to status update.
      // Body shape ready for: PATCH /bookings/:id/reject { reasonCode, note? }
      try {
        await apiFetch(`/bookings/${rejectTarget.id}/reject`, {
          method: "PATCH",
          body: JSON.stringify({
            reasonCode,
            note: rejectNote.trim() || undefined,
          }),
        });
      } catch {
        // Endpoint may not exist yet — use existing status endpoint
        await apiFetch(`/bookings/${rejectTarget.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" }),
        });
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === rejectTarget.id ? { ...b, status: "CANCELLED" as BookingStatus } : b))
      );
      setToast(`Booking rejected. ${rejectTarget.employee.name} will be notified.`);
      closeReject();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Could not reject booking");
    } finally {
      setActionId(null);
    }
  }

  return (
    <ManagerLayout>
      <div className="mb-page">
        <div className="mb-header">
          <div>
            <p className="manager-kicker">Bookings</p>
            <h1>All bookings</h1>
            <p className="mb-subtitle">Review requests, approve or reject with a reason.</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-summary">
          <div className="mb-summary-card">
            <span>Pending approval</span>
            <strong>{counts.pending}</strong>
          </div>
          <div className="mb-summary-card">
            <span>Confirmed</span>
            <strong>{counts.confirmed}</strong>
          </div>
          <div className="mb-summary-card">
            <span>Cancelled</span>
            <strong>{counts.cancelled}</strong>
          </div>
          <div className="mb-summary-card">
            <span>Total</span>
            <strong>{counts.total}</strong>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-toolbar">
          <div className="mb-filters">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={statusFilter === f.value ? "active" : ""}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
                {f.value === "PENDING" && counts.pending > 0 && (
                  <span className="mb-filter-badge">{counts.pending}</span>
                )}
              </button>
            ))}
          </div>
          <div className="mb-search">
            <input
              type="search"
              placeholder="Search employee, purpose, room…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search bookings"
            />
          </div>
        </div>

        {loading && (
          <div className="mb-state">
            <p>Loading bookings…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mb-state mb-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={loadBookings}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mb-table-wrap">
            <table className="mb-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Employee</th>
                  <th>Purpose</th>
                  <th>Room(s)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="mb-empty">
                      No bookings match this filter.
                    </td>
                  </tr>
                )}
                {filtered.map((booking) => (
                  <tr key={booking.id}>
                    <td className="mb-when">{formatTimeRange(booking.startAt, booking.endAt)}</td>
                    <td>
                      <div className="mb-employee">
                        <strong>{booking.employee.name}</strong>
                        <span>{booking.employee.email}</span>
                      </div>
                    </td>
                    <td className="mb-purpose">{booking.purpose}</td>
                    <td>
                      {booking.rooms.length
                        ? booking.rooms.map((r) => r.room.name).join(", ")
                        : "—"}
                    </td>
                    <td>
                      <span className={`mb-status mb-status--${statusClass(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                    </td>
                    <td>
                      {booking.status === "PENDING" ? (
                        <div className="mb-actions">
                          <button
                            type="button"
                            className="mb-btn mb-btn--approve"
                            disabled={actionId === booking.id}
                            onClick={() => handleApprove(booking)}
                          >
                            {actionId === booking.id ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="mb-btn mb-btn--reject"
                            disabled={actionId === booking.id}
                            onClick={() => openReject(booking)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="mb-no-action">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="mb-modal-overlay" role="presentation" onClick={closeReject}>
          <div
            className="mb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reject-title">Reject booking</h2>
            <p className="mb-modal-meta">
              <strong>{rejectTarget.purpose}</strong>
              <span>
                {rejectTarget.employee.name} · {formatTimeRange(rejectTarget.startAt, rejectTarget.endAt)}
              </span>
            </p>

            <label className="mb-field">
              <span>Reason *</span>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                aria-required="true"
              >
                <option value="">Select a reason…</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-field">
              <span>
                Optional note{reasonCode === "OTHER" ? " *" : ""}
              </span>
              <textarea
                rows={3}
                placeholder="Add context for the employee…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </label>

            {rejectError && <p className="mb-modal-error">{rejectError}</p>}

            <div className="mb-modal-actions">
              <button type="button" className="manager-outline-button" onClick={closeReject}>
                Cancel
              </button>
              <button
                type="button"
                className="mb-btn mb-btn--reject-solid"
                disabled={actionId === rejectTarget.id}
                onClick={submitReject}
              >
                {actionId === rejectTarget.id ? "Rejecting…" : "Reject booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="mb-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
