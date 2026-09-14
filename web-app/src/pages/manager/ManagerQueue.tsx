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

/** Start of local calendar day (for “hide past” filter). */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
  /** When true, only meetings starting today or later are listed. */
  const [hidePast, setHidePast] = useState(false);

  async function loadQueue() {
    try {
      setLoading(true);
      setError(null);
      // Prefer server-side status filter when supported; still works if ignored
      const data = await apiFetch<ApiBooking[]>(
        "/bookings?status=CONFIRMED,PREPARING,READY"
      );
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preparation queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  // All confirmed / preparing / ready — includes past meetings unless hidePast is on
  const queueItems = useMemo(() => {
    const today = startOfToday();
    return bookings
      .filter((b) => {
        if (!QUEUE_STATUSES.includes(b.status as QueueStatus)) return false;
        if (hidePast && new Date(b.startAt) < today) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, hidePast]);

  const pastInQueueCount = useMemo(() => {
    const today = startOfToday();
    return bookings.filter(
      (b) =>
        QUEUE_STATUSES.includes(b.status as QueueStatus) && new Date(b.startAt) < today
    ).length;
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
  return (
    <ManagerLayout>
      <div className="mq-page">
        <div className="mq-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Preparation queue</h1>
            <p className="mq-subtitle">
              Live view of room preparation for confirmed meetings. Status changes are made by
              clerks only — managers can monitor progress here.
            </p>
          </div>
        </div>

        <div className="mq-callout">
          <strong>Clerk workflow</strong>
          <p>
            Clerks move bookings through <em>Awaiting prep → Preparing → Ready</em> (and can move
            back if needed). This page is read-only for managers so you can track readiness without
            changing operational status.
          </p>
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
          <div className="mq-toolbar-right">
            <label className="mq-hide-past">
              <input
                type="checkbox"
                checked={hidePast}
                onChange={(e) => setHidePast(e.target.checked)}
              />
              <span>Hide past meetings</span>
            </label>
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
                {hidePast && pastInQueueCount > 0 && (
                  <p className="mq-empty-hint">
                    {pastInQueueCount} past meeting{pastInQueueCount === 1 ? "" : "s"} are hidden.
                    Uncheck “Hide past meetings” to show them.
                  </p>
                )}
                {!hidePast && bookings.filter((b) => b.status === "PENDING").length > 0 && (
                  <p className="mq-empty-hint">
                    Pending requests appear under All Bookings until you approve them — only
                    Confirmed / Preparing / Ready show here.
                  </p>
                )}
              </div>
            )}

            {filtered.map((booking) => {
              const amenityNames = (booking.amenities || []).map((a) => a.amenity.name);
              const roomNames = booking.rooms.map((r) => r.room.name).join(", ") || "—";
              const isPast = new Date(booking.startAt) < startOfToday();

              return (
                <article
                  key={booking.id}
                  className={`mq-card${isPast ? " mq-card--past" : ""}`}
                >
                  <div className="mq-card-main">
                    <div className="mq-card-time">
                      <strong>{formatTimeRange(booking.startAt, booking.endAt)}</strong>
                      <span className={`mq-status mq-status--${statusClass(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                      {isPast && <span className="mq-past-tag">Past</span>}
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
                    <span className="mq-view-only" title="Only clerks can change preparation status">
                      View only
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
