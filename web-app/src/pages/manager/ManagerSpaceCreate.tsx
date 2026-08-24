import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-facilities.css";

interface Amenity {
  id: number;
  name: string;
  description: string | null;
}

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "OUT_OF_SERVICE";

export default function ManagerSpaceCreate() {
  const navigate = useNavigate();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("8");
  const [status, setStatus] = useState<RoomStatus>("AVAILABLE");
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoadingAmenities(true);
        const data = await apiFetch<Amenity[]>("/amenities");
        setAmenities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load amenities");
      } finally {
        setLoadingAmenities(false);
      }
    }
    load();
  }, []);

  function toggleAmenity(id: number) {
    setSelectedAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cap = Number(capacity);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!cap || cap < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          capacity: cap,
          status,
          isActive: true,
          amenityIds: selectedAmenityIds,
        }),
      });
      navigate("/manager/spaces", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create space");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ManagerLayout>
      <div className="mf-page mf-page--narrow">
        <div className="mf-header">
          <div>
            <p className="manager-kicker">Facilities</p>
            <h1>Add space</h1>
            <p className="mf-subtitle">Create a new bookable room or area.</p>
          </div>
          <Link to="/manager/spaces" className="mf-back-link">
            ← Back to spaces
          </Link>
        </div>

        <form className="mf-form" onSubmit={handleSubmit}>
          <label className="mf-field">
            <span>Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Atlas Boardroom"
              required
            />
          </label>

          <label className="mf-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space best for?"
            />
          </label>

          <div className="mf-field-row">
            <label className="mf-field">
              <span>Capacity *</span>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </label>

            <label className="mf-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of service</option>
              </select>
            </label>
          </div>

          <fieldset className="mf-fieldset">
            <legend>Amenities</legend>
            {loadingAmenities && <p className="mf-hint">Loading amenities…</p>}
            {!loadingAmenities && amenities.length === 0 && (
              <p className="mf-hint">
                No amenities yet. You can add them under Amenities, then edit this space later.
              </p>
            )}
            <div className="mf-check-grid">
              {amenities.map((a) => (
                <label key={a.id} className="mf-check">
                  <input
                    type="checkbox"
                    checked={selectedAmenityIds.includes(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                  />
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="mf-form-error">{error}</p>}

          <div className="mf-form-actions">
            <Link to="/manager/spaces" className="manager-outline-button">
              Cancel
            </Link>
            <button type="submit" className="mf-btn mf-btn--primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create space"}
            </button>
          </div>
        </form>
      </div>
    </ManagerLayout>
  );
}
