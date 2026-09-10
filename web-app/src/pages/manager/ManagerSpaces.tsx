import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-facilities.css";

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "OUT_OF_SERVICE";

interface Amenity {
  id: number;
  name: string;
  description?: string | null;
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

const ROOM_STATUSES: { value: RoomStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
];

const STATUS_FILTERS: { value: "ALL" | RoomStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  ...ROOM_STATUSES,
];

function statusLabel(status: RoomStatus) {
  return ROOM_STATUSES.find((s) => s.value === status)?.label || status;
}

function statusClass(status: RoomStatus) {
  if (status === "AVAILABLE") return "available";
  if (status === "MAINTENANCE") return "maintenance";
  return "oos";
}

export default function ManagerSpaces() {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [catalog, setCatalog] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | RoomStatus>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Edit room modal (status + amenities)
  const [editRoom, setEditRoom] = useState<ApiRoom | null>(null);
  const [editStatus, setEditStatus] = useState<RoomStatus>("AVAILABLE");
  const [editAmenityIds, setEditAmenityIds] = useState<number[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadRooms() {
    try {
      setLoading(true);
      setError(null);
      const [roomsData, amenitiesData] = await Promise.all([
        apiFetch<ApiRoom[]>("/rooms"),
        apiFetch<Amenity[]>("/amenities").catch(() => [] as Amenity[]),
      ]);
      setRooms(roomsData);
      setCatalog(amenitiesData);
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

  /** Inline status change via select — any state, not cycle */
  async function setRoomStatus(room: ApiRoom, next: RoomStatus) {
    if (actionId || next === room.status) return;
    setActionId(room.id);
    try {
      const updated = await apiFetch<ApiRoom>(`/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, ...updated, status: next } : r))
      );
      setToast(`"${room.name}" → ${statusLabel(next)}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  }

  function openEdit(room: ApiRoom) {
    setEditRoom(room);
    setEditStatus(room.status);
    setEditAmenityIds(room.amenities.map((a) => a.id));
    setEditError(null);
  }

  function closeEdit() {
    setEditRoom(null);
    setEditError(null);
    setSavingEdit(false);
  }

  function toggleEditAmenity(id: number) {
    setEditAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editRoom) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await apiFetch<ApiRoom>(`/rooms/${editRoom.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editStatus,
          amenityIds: editAmenityIds,
        }),
      });
      setRooms((prev) =>
        prev.map((r) =>
          r.id === editRoom.id
            ? {
                ...r,
                ...updated,
                status: editStatus,
                amenities: updated.amenities ?? catalog.filter((a) => editAmenityIds.includes(a.id)),
              }
            : r
        )
      );
      setToast(`"${editRoom.name}" updated.`);
      closeEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update space");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <ManagerLayout>
      <div className="mf-page">
        <div className="mf-header">
          <div>
            <p className="manager-kicker">Facilities</p>
            <h1>Spaces</h1>
            <p className="mf-subtitle">
              Manage rooms, capacity, status, and which amenities each space offers.
            </p>
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

                {room.amenities.length > 0 ? (
                  <div className="mf-chips">
                    {room.amenities.map((a) => (
                      <span key={a.id} className="mf-chip">
                        {a.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mf-desc mf-desc--muted">No amenities assigned</p>
                )}

                <div className="mf-status-row">
                  <label className="mf-status-select-label">
                    <span>Status</span>
                    <select
                      className="mf-status-select"
                      value={room.status}
                      disabled={actionId === room.id}
                      onChange={(e) => setRoomStatus(room, e.target.value as RoomStatus)}
                      aria-label={`Status for ${room.name}`}
                    >
                      {ROOM_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mf-card-actions">
                  <button
                    type="button"
                    className="mf-btn mf-btn--ghost"
                    disabled={actionId === room.id}
                    onClick={() => openEdit(room)}
                  >
                    Edit amenities
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

      {editRoom && (
        <div className="mf-modal-overlay" role="presentation" onClick={closeEdit}>
          <div
            className="mf-modal mf-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-space-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-space-title">Edit {editRoom.name}</h2>
            <p className="mf-hint" style={{ marginBottom: 16 }}>
              Change status or which catalog amenities this space offers. To create new amenity
              types, use the Amenities page.
            </p>
            <form onSubmit={saveEdit}>
              <label className="mf-field">
                <span>Status</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as RoomStatus)}
                >
                  {ROOM_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="mf-fieldset">
                <legend>Amenities on this space</legend>
                {catalog.length === 0 && (
                  <p className="mf-hint">
                    No amenities in the catalog yet. Add them under Amenities first.
                  </p>
                )}
                <div className="mf-check-grid">
                  {catalog.map((a) => (
                    <label key={a.id} className="mf-check">
                      <input
                        type="checkbox"
                        checked={editAmenityIds.includes(a.id)}
                        onChange={() => toggleEditAmenity(a.id)}
                      />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {editError && <p className="mf-form-error">{editError}</p>}

              <div className="mf-form-actions">
                <button type="button" className="manager-outline-button" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="mf-btn mf-btn--primary" disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="mf-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
