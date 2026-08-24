import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-facilities.css";

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "OUT_OF_SERVICE";

interface Amenity {
  id: number;
  name: string;
}

interface ApiRoom {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  status: RoomStatus;
  isActive: boolean;
  amenities: Amenity[];
}

const STATUS_FILTERS: { value: "ALL" | RoomStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
];

function statusLabel(status: RoomStatus) {
  if (status === "AVAILABLE") return "Available";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Out of service";
}

function statusClass(status: RoomStatus) {
  if (status === "AVAILABLE") return "available";
  if (status === "MAINTENANCE") return "maintenance";
  return "oos";
}

export default function ManagerSpaces() {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | RoomStatus>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadRooms() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiRoom[]>("/rooms");
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spaces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (!r.isActive) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      const amenities = r.amenities.map((a) => a.name).join(" ").toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        amenities.includes(q)
      );
    });
  }, [rooms, statusFilter, search]);

  const counts = useMemo(
    () => ({
      total: rooms.filter((r) => r.isActive).length,
      available: rooms.filter((r) => r.isActive && r.status === "AVAILABLE").length,
      maintenance: rooms.filter((r) => r.isActive && r.status === "MAINTENANCE").length,
    }),
    [rooms]
  );

  async function archiveRoom(room: ApiRoom) {
    if (actionId) return;
    if (!window.confirm(`Archive "${room.name}"? It will no longer appear in active spaces.`)) return;

    setActionId(room.id);
    try {
      await apiFetch(`/rooms/${room.id}`, { method: "DELETE" });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, isActive: false } : r)));
      setToast(`"${room.name}" archived.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not archive space");
    } finally {
      setActionId(null);
    }
  }

  async function cycleStatus(room: ApiRoom) {
    if (actionId) return;
    const next: RoomStatus =
      room.status === "AVAILABLE"
        ? "MAINTENANCE"
        : room.status === "MAINTENANCE"
          ? "OUT_OF_SERVICE"
          : "AVAILABLE";

    setActionId(room.id);
    try {
      const updated = await apiFetch<ApiRoom>(`/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, ...updated, status: next } : r)));
      setToast(`"${room.name}" → ${statusLabel(next)}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  }

  return (
    <ManagerLayout>
      <div className="mf-page">
        <div className="mf-header">
          <div>
            <p className="manager-kicker">Facilities</p>
            <h1>Spaces</h1>
            <p className="mf-subtitle">Manage rooms, capacity, and availability.</p>
          </div>
          <Link to="/manager/spaces/create" className="mf-primary-link">
            + Add space
          </Link>
        </div>

        <div className="mf-summary">
          <div className="mf-summary-card">
            <span>Active spaces</span>
            <strong>{counts.total}</strong>
          </div>
          <div className="mf-summary-card">
            <span>Available</span>
            <strong>{counts.available}</strong>
          </div>
          <div className="mf-summary-card">
            <span>Maintenance</span>
            <strong>{counts.maintenance}</strong>
          </div>
        </div>

        <div className="mf-toolbar">
          <div className="mf-filters">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={statusFilter === f.value ? "active" : ""}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mf-search">
            <input
              type="search"
              placeholder="Search name, description, amenity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="mf-state">
            <p>Loading spaces…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mf-state mf-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={loadRooms}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mf-grid">
            {filtered.length === 0 && (
              <div className="mf-empty">
                <p>No spaces match this filter.</p>
                <Link to="/manager/spaces/create">Add your first space</Link>
              </div>
            )}

            {filtered.map((room) => (
              <article key={room.id} className="mf-card">
                <div className="mf-card-top">
                  <div>
                    <h3>{room.name}</h3>
                    <p className="mf-capacity">{room.capacity} people</p>
                  </div>
                  <span className={`mf-badge mf-badge--${statusClass(room.status)}`}>
                    {statusLabel(room.status)}
                  </span>
                </div>

                {room.description && <p className="mf-desc">{room.description}</p>}

                {room.amenities.length > 0 && (
                  <div className="mf-chips">
                    {room.amenities.map((a) => (
                      <span key={a.id} className="mf-chip">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mf-card-actions">
                  <button
                    type="button"
                    className="mf-btn mf-btn--ghost"
                    disabled={actionId === room.id}
                    onClick={() => cycleStatus(room)}
                  >
                    Change status
                  </button>
                  <button
                    type="button"
                    className="mf-btn mf-btn--danger"
                    disabled={actionId === room.id}
                    onClick={() => archiveRoom(room)}
                  >
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="mf-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
