import { useEffect, useState } from "react";
import axios from "axios";
import type { Booking, BookingStatus } from "@/types/booking";
import BookingChecklist from "@/components/BookingChecklist";

export default function ClerkDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const res = await axios.get("/api/v1/bookings", {
      params: { date: new Date().toISOString().split("T")[0] },
    });
    setBookings(res.data);
    setLoading(false);
  }

  async function updateStatus(id: number, next: BookingStatus) {
    await axios.patch(`/api/v1/bookings/${id}/status`, { status: next });
    fetchBookings();
  }

  function nextStatus(status: BookingStatus): BookingStatus | null {
    switch (status) {
      case "CONFIRMED": return "PREPARING";
      case "PREPARING": return "READY";
      case "READY": return "COMPLETED";
      default: return null;
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div className="clerk-dashboard">
      <header>
        <h2>Today’s preparation queue</h2>
      </header>

      <table className="queue-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Booking</th>
            <th>Rooms</th>
            <th>Status</th>
            <th>Action</th>
            <th>Checklist</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => {
            const next = nextStatus(b.status);
            return (
              <tr key={b.id}>
                <td>
                  {new Date(b.startAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                  –
                  {new Date(b.endAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                </td>
                <td>{b.purpose}</td>
                <td>{b.rooms.map(r => r.room.name).join(", ")}</td>
                <td>{b.status}</td>
                <td>
                  {next && (
                    <button onClick={() => updateStatus(b.id, next)}>
                      {next === "PREPARING" ? "Prepare" :
                       next === "READY" ? "Continue" :
                       "Complete"}
                    </button>
                  )}
                </td>
                <td>
                  <button onClick={() => setSelectedBooking(b)}>
                    Open checklist
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedBooking && (
        <div className="checklist-drawer">
          <button onClick={() => setSelectedBooking(null)}>Close</button>
          <BookingChecklist booking={selectedBooking} />
        </div>
      )}
    </div>
  );
}
