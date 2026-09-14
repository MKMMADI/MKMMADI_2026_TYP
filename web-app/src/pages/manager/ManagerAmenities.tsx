import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-facilities.css";

interface ApiAmenity {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function ManagerAmenities() {
  const [amenities, setAmenities] = useState<ApiAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // create | edit
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<ApiAmenity | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAmenities() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiAmenity[]>("/amenities");
      setAmenities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load amenities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAmenities();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return amenities;
    return amenities.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
    );
  }, [amenities, search]);

  function openCreate() {
    setModalMode("create");
    setEditTarget(null);
    setName("");
    setDescription("");
    setFormError(null);
  }

  function openEdit(amenity: ApiAmenity) {
    setModalMode("edit");
    setEditTarget(amenity);
    setName(amenity.name);
    setDescription(amenity.description || "");
    setFormError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (modalMode === "create") {
        const created = await apiFetch<ApiAmenity>("/amenities", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            isActive: true,
          }),
        });
        setAmenities((prev) => [created, ...prev]);
        setToast(`Amenity "${created.name}" added.`);
      } else if (modalMode === "edit" && editTarget) {
        const updated = await apiFetch<ApiAmenity>(`/amenities/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });
        setAmenities((prev) =>
          prev.map((a) => (a.id === editTarget.id ? { ...a, ...updated } : a))
        );
        setToast(`Amenity "${updated.name}" updated.`);
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save amenity");
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveAmenity(amenity: ApiAmenity) {
    if (actionId) return;
    if (!window.confirm(`Archive "${amenity.name}"? It will no longer be assignable to spaces.`)) {
      return;
    }
    setActionId(amenity.id);
    try {
      await apiFetch(`/amenities/${amenity.id}`, { method: "DELETE" });
      setAmenities((prev) => prev.filter((a) => a.id !== amenity.id));
      setToast(`"${amenity.name}" archived.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not archive amenity");
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
            <h1>Amenities</h1>
            <p className="mf-subtitle">
              Catalog of room features (Wi‑Fi, projector, whiteboard, etc.) that you attach to
              spaces. This is not stock levels — for consumables and inventory levels, use{" "}
              <Link to="/manager/inventory" className="mf-inline-link">
                Inventory
              </Link>
              .
            </p>
          </div>
          <button type="button" className="mf-primary-link" onClick={openCreate}>
            + Add amenity
          </button>
        </div>

        <div className="mf-callout">
          <strong>Amenities vs Inventory</strong>
          <p>
            <em>Amenities</em> are fixed features of a space (what the room offers when booked).
            <em> Inventory</em> tracks consumable stock (paper, markers, water) and levels that can
            run low.
          </p>
        </div>

        <div className="mf-toolbar">
          <div className="mf-summary-inline">
            <strong>{amenities.length}</strong> active amenities
          </div>
          <div className="mf-search">
            <input
              type="search"
              placeholder="Search amenities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="mf-state">
            <p>Loading amenities…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mf-state mf-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={loadAmenities}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="mf-empty-cell">
                      No amenities found.
                    </td>
                  </tr>
                )}
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                    </td>
                    <td className="mf-muted">{a.description || "—"}</td>
                    <td>
                      <div className="mf-row-actions">
                        <button
                          type="button"
                          className="mf-btn mf-btn--ghost"
                          disabled={actionId === a.id}
                          onClick={() => openEdit(a)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="mf-btn mf-btn--danger"
                          disabled={actionId === a.id}
                          onClick={() => archiveAmenity(a)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="mf-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="mf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="amenity-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="amenity-title">{modalMode === "create" ? "Add amenity" : "Edit amenity"}</h2>
            <form onSubmit={handleSubmit}>
              <label className="mf-field">
                <span>Name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Video conferencing"
                  required
                />
              </label>
              <label className="mf-field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details shown when assigning to spaces"
                />
              </label>
              {formError && <p className="mf-form-error">{formError}</p>}
              <div className="mf-form-actions">
                <button type="button" className="manager-outline-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="mf-btn mf-btn--primary" disabled={submitting}>
                  {submitting
                    ? "Saving…"
                    : modalMode === "create"
                      ? "Save amenity"
                      : "Save changes"}
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
