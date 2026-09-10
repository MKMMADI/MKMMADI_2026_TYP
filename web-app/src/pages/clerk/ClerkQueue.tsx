import { useEffect, useMemo, useState } from "react";
import OpsLayout from "@/components/OpsLayout";
import { apiFetch } from "@/lib/api";

type PrepStatus = "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED";

interface ApiBooking {
  id: number;
  purpose: string;
  startAt: string;
  endAt: string;
  status: string;
  employee: { id: number; name: string; email: string };
  preparedBy?: { id: number; name: string } | null;
  rooms: { room: { id: number; name: string } }[];
  amenities: { amenity: { id: number; name: string } }[];
}

const PREP_OPTIONS: { value: PrepStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Awaiting prep" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
];

const FILTERS: { value: "ALL" | PrepStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Awaiting" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
];

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-ZA", dateOpts)} · ${start.toLocaleTimeString("en-ZA", timeOpts)}–${end.toLocaleTimeString("en-ZA", timeOpts)}`;
}

function statusClass(status: string) {
  if (status === "PREPARING") return "preparing";
  if (status === "READY") return "ready";
  return "awaiting";
}

function statusLabel(status: string) {
  return PREP_OPTIONS.find((o) => o.value === status)?.label || status;
}

export default function ClerkQueue() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | PrepStatus>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiBooking[]>(
        "/bookings?status=CONFIRMED,PREPARING,READY"
      );
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const sorted = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((b) => {
      if (filter !== "ALL" && b.status !== filter) return false;
      if (!q) return true;
      const rooms = b.rooms.map((r) => r.room.name).join(" ").toLowerCase();
      return (
        b.purpose.toLowerCase().includes(q) ||
        b.employee.name.toLowerCase().includes(q) ||
        rooms.includes(q)
      );
    });
  }, [sorted, filter, search]);

  const counts = useMemo(
    () => ({
      awaiting: bookings.filter((b) => b.status === "CONFIRMED").length,
      preparing: bookings.filter((b) => b.status === "PREPARING").length,
      ready: bookings.filter((b) => b.status === "READY").length,
    }),
    [bookings]
  );

  async function setStatus(booking: ApiBooking, status: PrepStatus) {
    if (actionId || status === booking.status) return;
    setActionId(booking.id);
    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status } : b)).filter((b) => {
          // drop from queue list if completed
          if (b.id === booking.id && status === "COMPLETED") return false;
          return true;
        })
      );
      setToast(`Updated to ${statusLabel(status)}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  }

  return (
    <OpsLayout mode="clerk">
      <h1 className="field-page-title">Preparation queue</h1>
      <p className="field-page-sub">
        Prepare rooms for confirmed meetings. You can move status forward or back if needed.
      </p>

      <div className="field-chips" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`field-chip${filter === f.value ? " active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value === "CONFIRMED" && counts.awaiting > 0 && (
              <span className="field-chip-count">{counts.awaiting}</span>
            )}
            {f.value === "PREPARING" && counts.preparing > 0 && (
              <span className="field-chip-count">{counts.preparing}</span>
            )}
            {f.value === "READY" && counts.ready > 0 && (
              <span className="field-chip-count">{counts.ready}</span>
            )}
          </button>
        ))}
      </div>

      <div className="field-search">
        <input
          type="search"
          placeholder="Search purpose, employee, room…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search queue"
        />
      </div>

      {loading && (
        <div className="field-state">
          <p>Loading queue…</p>
        </div>
      )}

      {error && !loading && (
        <div className="field-state field-state--error">
          <p>{error}</p>
          <button type="button" className="field-btn field-btn--primary" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="field-state">
          <p>No bookings in this part of the queue.</p>
        </div>
      )}

      {!loading &&
        !error &&
        filtered.map((booking) => {
          const rooms = booking.rooms.map((r) => r.room.name).join(", ") || "—";
          const amenities = (booking.amenities || []).map((a) => a.amenity.name);
          return (
            <article key={booking.id} className="field-card">
              <div className="field-card-time">
                <strong>{formatTimeRange(booking.startAt, booking.endAt)}</strong>
                <span className={`field-status field-status--${statusClass(booking.status)}`}>
                  {statusLabel(booking.status)}
                </span>
              </div>
              <h3>{booking.purpose}</h3>
              <p className="field-meta">
                {booking.employee.name} · {rooms}
              </p>
              {amenities.length > 0 && (
                <div className="field-tags">
                  {amenities.map((name) => (
                    <span key={name} className="field-tag">
                      {name}
                    </span>
                  ))}
                </div>
              )}
              {booking.preparedBy?.name && (
                <p className="field-meta">Claimed by {booking.preparedBy.name}</p>
              )}
              <div className="field-card-actions">
                <label className="field-meta" style={{ marginBottom: 0 }}>
                  Change status
                </label>
                <select
                  className="field-select"
                  value={booking.status}
                  disabled={actionId === booking.id}
                  onChange={(e) => setStatus(booking, e.target.value as PrepStatus)}
                  aria-label={`Status for ${booking.purpose}`}
                >
                  {PREP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          );
        })}

      {toast && (
        <div className="field-toast" role="status">
          {toast}
        </div>
      )}
    </OpsLayout>
  );
}
