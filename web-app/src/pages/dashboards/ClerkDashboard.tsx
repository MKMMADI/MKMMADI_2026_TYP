import { useEffect, useState } from "react";
import axios from "axios";
import type { Booking, BookingStatus } from "@/types/booking";
import BookingChecklist from "@/components/BookingChecklist";

const PREP_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Awaiting prep" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
];

export default function ClerkDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/api/v1/bookings", {
        params: {
          status: "CONFIRMED,PREPARING,READY",
        },
      });
      setBookings(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, next: BookingStatus) {
    if (actionId) return;
    setActionId(id);
    setError(null);
    try {
      await axios.patch(`/api/v1/bookings/${id}/status`, { status: next });
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div className="clerk-dashboard">
      <header>
        <h2>Today’s preparation queue</h2>
        <p style={{ color: "#738184", fontSize: 14, marginTop: 4 }}>
          Update room prep status. You can move from Ready back to Preparing or Awaiting prep if
          needed.
        </p>
      </header>

      {error && (
        <p style={{ color: "#d4735e", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      <table className="queue-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Booking</th>
            <th>Rooms</th>
            <th>Status</th>
            <th>Change status</th>
            <th>Checklist</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#738184", padding: 24 }}>
                No bookings in the preparation queue.
              </td>
            </tr>
          )}
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                {new Date(b.startAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                –
                {new Date(b.endAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td>{b.purpose}</td>
              <td>{b.rooms.map((r) => r.room.name).join(", ")}</td>
              <td>{b.status}</td>
              <td>
                <select
                  value={b.status}
                  disabled={actionId === b.id}
                  onChange={(e) => updateStatus(b.id, e.target.value as BookingStatus)}
                  aria-label={`Preparation status for ${b.purpose}`}
                >
                  {PREP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button type="button" onClick={() => setSelectedBooking(b)}>
                  Open checklist
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedBooking && (
        <div className="checklist-drawer">
          <button type="button" onClick={() => setSelectedBooking(null)}>
            Close
          </button>
          <BookingChecklist booking={selectedBooking} />
        </div>
      )}
    </div>
  );
}
