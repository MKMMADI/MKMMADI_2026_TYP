import { useState, useEffect, useMemo } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-queue.css";

type QueueStatus = "CONFIRMED" | "PREPARING" | "READY";

interface ApiBooking {
  id: number;
  purpose: string;
  startAt: string;
  endAt: string;
  status: string;
  preparedById?: number | null;
  employee: { id: number; name: string; email: string };
  preparedBy?: { id: number; name: string } | null;
  rooms: { room: { id: number; name: string; capacity: number } }[];
  amenities: { amenity: { id: number; name: string } }[];
}

const QUEUE_STATUSES: QueueStatus[] = ["CONFIRMED", "PREPARING", "READY"];

const FILTERS: { value: "ALL" | QueueStatus; label: string }[] = [
  { value: "ALL", label: "All in queue" },
  { value: "CONFIRMED", label: "Awaiting prep" },
  { value: "PREPARING", label: "In progress" },
  { value: "READY", label: "Ready" },
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
  return `${start.toLocaleDateString("en-ZA", dateOpts)} · ${start.toLocaleTimeString("en-ZA", timeOpts)} – ${end.toLocaleTimeString("en-ZA", timeOpts)}`;
}

function isUpcomingOrToday(startAt: string) {
  const start = new Date(startAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(0, 0, 0, 0);
  return start >= cutoff;
}

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Awaiting prep";
  if (status === "PREPARING") return "Preparing";
  if (status === "READY") return "Ready";
  return status;
}

function statusClass(status: string) {
  if (status === "CONFIRMED") return "awaiting";
  if (status === "PREPARING") return "preparing";
  if (status === "READY") return "ready";
  return "awaiting";
}

export default function ManagerQueue() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | QueueStatus>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadQueue() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiBooking[]>("/bookings");
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preparation queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const queueItems = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          QUEUE_STATUSES.includes(b.status as QueueStatus) && isUpcomingOrToday(b.startAt)
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queueItems.filter((b) => {
      if (filter !== "ALL" && b.status !== filter) return false;
      if (!q) return true;
      const rooms = b.rooms.map((r) => r.room.name).join(" ").toLowerCase();
      const amenities = (b.amenities || [])
        .map((a) => a.amenity.name)
        .join(" ")
        .toLowerCase();
      return (
        b.purpose.toLowerCase().includes(q) ||
        b.employee.name.toLowerCase().includes(q) ||
        rooms.includes(q) ||
        amenities.includes(q)
      );
    });
  }, [queueItems, filter, search]);

  const counts = useMemo(
    () => ({
      awaiting: queueItems.filter((b) => b.status === "CONFIRMED").length,
      preparing: queueItems.filter((b) => b.status === "PREPARING").length,
      ready: queueItems.filter((b) => b.status === "READY").length,
    }),
    [queueItems]
  );

  async function setStatus(booking: ApiBooking, status: QueueStatus, successMsg: string) {
    if (actionId) return;
    setActionId(booking.id);
    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status } : b))
      );
      setToast(successMsg);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  }

  return (
    <ManagerLayout>
      <div className="mq-page">
        <div className="mq-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Preparation queue</h1>
            <p className="mq-subtitle">
              Get confirmed bookings room-ready before the meeting starts.
            </p>
          </div>
        </div>

        <div className="mq-summary">
          <div className="mq-summary-card mq-summary-card--awaiting">
            <span>Awaiting prep</span>
            <strong>{counts.awaiting}</strong>
          </div>
          <div className="mq-summary-card mq-summary-card--preparing">
            <span>In progress</span>
            <strong>{counts.preparing}</strong>
          </div>
          <div className="mq-summary-card mq-summary-card--ready">
            <span>Ready</span>
            <strong>{counts.ready}</strong>
          </div>
          <div className="mq-summary-card">
            <span>Total in queue</span>
            <strong>{queueItems.length}</strong>
          </div>
        </div>

        <div className="mq-toolbar">
          <div className="mq-filters">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={filter === f.value ? "active" : ""}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                {f.value === "CONFIRMED" && counts.awaiting > 0 && (
                  <span className="mq-filter-badge">{counts.awaiting}</span>
                )}
                {f.value === "PREPARING" && counts.preparing > 0 && (
                  <span className="mq-filter-badge mq-filter-badge--blue">{counts.preparing}</span>
                )}
              </button>
            ))}
          </div>
          <div className="mq-search">
            <input
              type="search"
              placeholder="Search purpose, employee, room, amenity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search queue"
            />
          </div>
        </div>

        {loading && (
          <div className="mq-state">
            <p>Loading preparation queue…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mq-state mq-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={loadQueue}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mq-list">
            {filtered.length === 0 && (
              <div className="mq-empty">
                <p>No bookings in this part of the queue.</p>
              </div>
            )}

            {filtered.map((booking) => {
              const amenityNames = (booking.amenities || []).map((a) => a.amenity.name);
              const roomNames = booking.rooms.map((r) => r.room.name).join(", ") || "—";

              return (
                <article key={booking.id} className="mq-card">
                  <div className="mq-card-main">
                    <div className="mq-card-time">
                      <strong>{formatTimeRange(booking.startAt, booking.endAt)}</strong>
                      <span className={`mq-status mq-status--${statusClass(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                    </div>

                    <div className="mq-card-body">
                      <h3>{booking.purpose}</h3>
                      <p className="mq-meta">
                        <span>{booking.employee.name}</span>
                        <span className="mq-dot">·</span>
                        <span>{roomNames}</span>
                      </p>

                      {amenityNames.length > 0 && (
                        <div className="mq-amenities">
                          {amenityNames.map((name) => (
                            <span key={name} className="mq-chip">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      {booking.preparedBy?.name && (
                        <p className="mq-prepared-by">Prepared by {booking.preparedBy.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="mq-card-actions">
                    {booking.status === "CONFIRMED" && (
                      <button
                        type="button"
                        className="mq-btn mq-btn--start"
                        disabled={actionId === booking.id}
                        onClick={() =>
                          setStatus(booking, "PREPARING", "Prep started — marked as Preparing.")
                        }
                      >
                        {actionId === booking.id ? "…" : "Start prep"}
                      </button>
                    )}

                    {booking.status === "PREPARING" && (
                      <button
                        type="button"
                        className="mq-btn mq-btn--ready"
                        disabled={actionId === booking.id}
                        onClick={() =>
                          setStatus(booking, "READY", "Room marked Ready for the meeting.")
                        }
                      >
                        {actionId === booking.id ? "…" : "Mark ready"}
                      </button>
                    )}

                    {booking.status === "READY" && (
                      <span className="mq-done-label">Set for meeting</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="mq-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
