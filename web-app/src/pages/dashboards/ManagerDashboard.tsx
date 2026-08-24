import { useState, useEffect } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";

type IconName =
  | "grid"
  | "calendar"
  | "room"
  | "people"
  | "chart"
  | "bell"
  | "plus"
  | "more"
  | "arrow"
  | "clock"
  | "wifi"
  | "box"
  | "user"
  | "settings"
  | "filter";

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" {...common} />
        <rect x="14" y="3" width="7" height="7" rx="1" {...common} />
        <rect x="3" y="14" width="7" height="7" rx="1" {...common} />
        <rect x="14" y="14" width="7" height="7" rx="1" {...common} />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" {...common} />
        <path d="M8 3v4M16 3v4M3 10h18" {...common} />
      </>
    ),
    room: (
      <>
        <path d="M4 21V5a2 2 0 012-2h9a2 2 0 012 2v16" {...common} />
        <path d="M4 21h16" {...common} />
        <path d="M8 8h3M8 12h3" {...common} />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" {...common} />
        <path d="M3 21v-2a5 5 0 015-5h2a5 5 0 015 5v2" {...common} />
        <path d="M17 5.5a3 3 0 010 5" {...common} />
        <path d="M20 21v-2a5 5 0 00-3-4.58" {...common} />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" {...common} />
        <path d="M4 19h17" {...common} />
        <path d="M8 16v-4" {...common} />
        <path d="M13 16V8" {...common} />
        <path d="M18 16V5" {...common} />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} />
        <path d="M10 22h4" {...common} />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" {...common} />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" {...common} strokeWidth={3} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...common} />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" {...common} />
        <path d="M12 6v6l4 2" {...common} />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.55a11 11 0 0114.08 0" {...common} />
        <path d="M1.42 9a16 16 0 0121.16 0" {...common} />
        <path d="M8.53 16.11a6 6 0 016.94 0" {...common} />
        <circle cx="12" cy="20" r="1" {...common} />
      </>
    ),
    box: (
      <>
        <path
          d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
          {...common}
        />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" {...common} />
        <path d="M12 22.08V12" {...common} />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" {...common} />
        <circle cx="12" cy="7" r="4" {...common} />
      </>
    ),
    settings: (
      <>
        <path
          d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
          {...common}
        />
        <circle cx="12" cy="12" r="3" {...common} />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" {...common} />,
  };

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ===== Types matching the API =====
type BookingStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

interface ApiBooking {
  id: number;
  purpose: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  employee: { id: number; name: string; email: string };
  rooms: { room: { id: number; name: string; capacity: number } }[];
}

interface ApiRoom {
  id: number;
  name: string;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_SERVICE";
  isActive: boolean;
}

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  return `${start.toLocaleTimeString("en-ZA", opts)} - ${end.toLocaleTimeString("en-ZA", opts)}`;
}

function statusToColor(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    PENDING: "blue",
    CONFIRMED: "teal",
    PREPARING: "blue",
    READY: "amber",
    COMPLETED: "green",
    CANCELLED: "red",
  };
  return map[status] || "teal";
}

function statusLabel(status: BookingStatus): string {
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

function roomTone(status: ApiRoom["status"]): string {
  if (status === "AVAILABLE") return "available";
  if (status === "MAINTENANCE") return "busy";
  return "busy";
}

function roomStateLabel(status: ApiRoom["status"]): string {
  if (status === "AVAILABLE") return "Available";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Out of service";
}

export default function ManagerDashboard() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [bookingsData, roomsData] = await Promise.all([
          apiFetch<ApiBooking[]>("/bookings"),
          apiFetch<ApiRoom[]>("/rooms"),
        ]);

        if (!cancelled) {
          setBookings(bookingsData);
          setRooms(roomsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived stats from real data
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysBookings = bookings.filter((b) => {
    const start = new Date(b.startAt);
    return start >= todayStart && start <= todayEnd;
  });

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  const summary = {
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    preparing: bookings.filter((b) => b.status === "PREPARING").length,
    ready: bookings.filter((b) => b.status === "READY").length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
  };

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE" && r.isActive).length;
  const utilisation =
    rooms.length === 0 ? 0 : Math.round(((rooms.length - availableRooms) / rooms.length) * 100);

  return (
    <ManagerLayout>
      {loading && (
        <div style={{ padding: "3rem", textAlign: "center", color: "#738184" }}>
          <p>Loading dashboard…</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#d4735e", marginBottom: "1rem" }}>{error}</p>
          <button
            type="button"
            className="manager-outline-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="manager-welcome">
            <div>
              <p className="manager-kicker">Overview</p>
              <h1>Good morning, Lerato.</h1>
              <p>Here's what's happening across your spaces today.</p>
            </div>
            <div className="manager-welcome-actions">
              <button type="button" className="manager-outline-button">
                <Icon name="filter" size={16} />
                Filter
              </button>
              <button type="button" className="manager-outline-button">
                View calendar <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>

          {/* Stats – driven by API data */}
          <section className="manager-stats" aria-label="Today's statistics">
            <article>
              <span className="manager-stat-icon manager-stat-icon--teal">
                <Icon name="calendar" />
              </span>
              <div>
                <span>Today's bookings</span>
                <strong>{todaysBookings.length}</strong>
                <small className="neutral">
                  {bookings.length} <em>total</em>
                </small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--violet">
                <Icon name="room" />
              </span>
              <div>
                <span>Space utilisation</span>
                <strong>{utilisation}%</strong>
                <small className="neutral">
                  {availableRooms} <em>available</em>
                </small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--amber">
                <Icon name="people" />
              </span>
              <div>
                <span>Active spaces</span>
                <strong>{rooms.filter((r) => r.isActive).length}</strong>
                <small className="neutral">
                  {rooms.length} <em>total</em>
                </small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--green">
                <Icon name="box" />
              </span>
              <div>
                <span>Preparing</span>
                <strong>{summary.preparing}</strong>
                <small className="down">
                  {summary.preparing > 0 ? "needs attention" : "all clear"}
                </small>
              </div>
            </article>
          </section>

          <div className="manager-grid">
            {/* Recent Bookings – from API */}
            <section className="manager-panel manager-recent-bookings">
              <div className="manager-panel-header">
                <div>
                  <h2>Recent Bookings</h2>
                  <p>Upcoming and ongoing meetings</p>
                </div>
                <button type="button">
                  View all <Icon name="arrow" size={16} />
                </button>
              </div>

              <div className="manager-recent-bookings-list">
                {recentBookings.length === 0 && (
                  <p style={{ padding: "1rem 0", color: "#738184", fontSize: 13 }}>
                    No bookings yet.
                  </p>
                )}
                {recentBookings.map((booking) => (
                  <article key={booking.id} className="manager-booking-item">
                    <div className="manager-booking-time">
                      <strong>{formatTimeRange(booking.startAt, booking.endAt)}</strong>
                    </div>
                    <div className="manager-booking-info">
                      <h3>{booking.purpose}</h3>
                      <p>
                        <span className="manager-booking-employee">{booking.employee.name}</span>
                        <span className="manager-booking-room">
                          {" · "}
                          {booking.rooms.map((r) => r.room.name).join(", ") || "No room"}
                        </span>
                      </p>
                    </div>
                    <div className="manager-booking-status-wrapper">
                      <span className={`manager-booking-status ${statusToColor(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                    </div>
                    <button type="button" aria-label={`More options for ${booking.purpose}`}>
                      <Icon name="more" size={18} />
                    </button>
                  </article>
                ))}
              </div>

              <div className="manager-booking-summary">
                <div className="manager-summary-item">
                  <span className="summary-dot confirmed"></span>
                  <span>Confirmed: {summary.confirmed}</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot preparing"></span>
                  <span>Preparing: {summary.preparing}</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot ready"></span>
                  <span>Ready: {summary.ready}</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot completed"></span>
                  <span>Completed: {summary.completed}</span>
                </div>
              </div>
            </section>

            {/* Spaces – from API */}
            <section className="manager-panel manager-spaces">
              <div className="manager-panel-header">
                <div>
                  <h2>Spaces at a glance</h2>
                  <p>Live availability</p>
                </div>
                <button type="button">Manage spaces</button>
              </div>

              {rooms.slice(0, 5).map((room) => (
                <article className="manager-room" key={room.id}>
                  <span className="manager-room-art">
                    <Icon name="room" />
                  </span>
                  <div>
                    <h3>{room.name}</h3>
                    <p>{room.capacity} people</p>
                  </div>
                  <span className={`manager-status ${roomTone(room.status)}`}>
                    {roomStateLabel(room.status)}
                  </span>
                </article>
              ))}

              {rooms.length === 0 && (
                <p style={{ padding: "1rem 24px", color: "#738184", fontSize: 13 }}>
                  No spaces yet.
                </p>
              )}

              <button type="button" className="manager-room-footer">
                See all spaces <Icon name="arrow" size={16} />
              </button>
            </section>
          </div>

          {/* Insights */}
          <section className="manager-panel manager-insights">
            <div>
              <p className="manager-kicker">Weekly insight</p>
              <h2>Your spaces are working harder.</h2>
              <p>
                You currently have {rooms.length} active spaces and {todaysBookings.length} bookings
                scheduled for today.
              </p>
              <button type="button">
                View insights <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="manager-bars" aria-label="Space usage chart">
              <span style={{ height: "45%" }} />
              <span style={{ height: "61%" }} />
              <span style={{ height: "53%" }} />
              <span style={{ height: "78%" }} />
              <span style={{ height: "72%" }} />
              <span className="current" style={{ height: `${Math.max(utilisation, 20)}%` }} />
            </div>
          </section>

          {/* Quick Actions */}
          <div className="manager-quick-actions">
            <h3>Quick Actions</h3>
            <div className="manager-quick-action-grid">
              <button className="quick-action-card">
                <Icon name="plus" size={24} />
                <span>New Room</span>
              </button>
              <button className="quick-action-card">
                <Icon name="wifi" size={24} />
                <span>Add Amenity</span>
              </button>
              <button className="quick-action-card">
                <Icon name="box" size={24} />
                <span>Update Stock</span>
              </button>
              <button className="quick-action-card">
                <Icon name="chart" size={24} />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        </>
      )}
    </ManagerLayout>
  );
}
