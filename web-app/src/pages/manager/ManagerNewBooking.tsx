import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-operations.css";
import "@/styles/manager-notifications.css";

interface BookingRoom {
  id: number;
  name: string;
  capacity: number;
  status: string;
}

interface BookingAmenity {
  id: number;
  name: string;
}

interface RoomWithAmenities extends BookingRoom {
  amenities: BookingAmenity[];
}

export default function ManagerNewBooking() {
  const [rooms, setRooms] = useState<RoomWithAmenities[]>([]);
  const [amenities, setAmenities] = useState<BookingAmenity[]>([]);
  const [purpose, setPurpose] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [roomIds, setRoomIds] = useState<number[]>([]);
  const [amenityIds, setAmenityIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([apiFetch<RoomWithAmenities[]>("/rooms"), apiFetch<BookingAmenity[]>("/amenities")])
      .then(([roomData, amenityData]) => {
        if (!active) return;
        setRooms(Array.isArray(roomData) ? roomData.filter((room) => room.status === "AVAILABLE") : []);
        setAmenities(Array.isArray(amenityData) ? amenityData : []);
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : "Could not load booking options");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedRooms = rooms.filter((room) => roomIds.includes(room.id));
  const supportedAmenities = useMemo(() => {
    if (selectedRooms.length === 0) return amenities;
    return amenities.filter((amenity) =>
      selectedRooms.every((room) => room.amenities.some((roomAmenity) => roomAmenity.id === amenity.id)),
    );
  }, [amenities, selectedRooms]);

  function toggleRoom(roomId: number) {
    setRoomIds((previous) =>
      previous.includes(roomId) ? previous.filter((id) => id !== roomId) : [...previous, roomId],
    );
    setAmenityIds([]);
  }

  function toggleAmenity(amenityId: number) {
    setAmenityIds((previous) =>
      previous.includes(amenityId) ? previous.filter((id) => id !== amenityId) : [...previous, amenityId],
    );
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (roomIds.length === 0) {
      setError("Select at least one room.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError("The end time must be after the start time.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          purpose: purpose.trim(),
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          roomIds,
          amenityIds,
          capacity: Number(capacity),
        }),
      });
      setSuccess("Booking created successfully.");
      setPurpose("");
      setStartAt("");
      setEndAt("");
      setCapacity("");
      setRoomIds([]);
      setAmenityIds([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ManagerLayout>
      <div className="manager-new-booking-page mo-page">
        <header className="mo-header">
          <div>
            <p className="manager-kicker">Bookings</p>
            <h1>New booking</h1>
            <p className="mo-subtitle">Create a booking for yourself. The system will validate room availability.</p>
          </div>
          <Link className="mo-back-link" to="/manager/bookings">All bookings</Link>
        </header>

        {loadError ? <p className="manager-alert-error" role="alert">{loadError}</p> : null}
        {error ? <p className="manager-alert-error" role="alert">{error}</p> : null}
        {success ? <p className="manager-alert-success" role="status">{success}</p> : null}
        {loading ? <p role="status">Loading booking options…</p> : null}

        {!loading && !loadError ? (
          <form
            aria-label="New booking form"
            className="manager-booking-form mo-form"
            onSubmit={(event) => void submitBooking(event)}
          >
            <label className="mo-field">
              <span>Purpose</span>
              <input required value={purpose} onChange={(event) => setPurpose(event.target.value)} />
            </label>
            <div className="manager-booking-form-row mo-field-row">
              <label className="mo-field mo-field--inline">
                <span>Start</span>
                <input aria-label="Start" type="datetime-local" required value={startAt} onChange={(event) => setStartAt(event.target.value)} />
              </label>
              <label className="mo-field mo-field--inline">
                <span>End</span>
                <input aria-label="End" type="datetime-local" required value={endAt} onChange={(event) => setEndAt(event.target.value)} />
              </label>
              <label className="mo-field mo-field--inline">
                <span>Capacity</span>
                <input type="number" min="1" step="1" required value={capacity} onChange={(event) => setCapacity(event.target.value)} />
              </label>
            </div>

            <fieldset className="manager-booking-group">
              <legend>Rooms</legend>
              {rooms.length === 0 ? <p>No bookable rooms are currently available.</p> : null}
              {rooms.map((room) => (
                <label className="manager-booking-option" key={room.id}>
                  <input type="checkbox" checked={roomIds.includes(room.id)} onChange={() => toggleRoom(room.id)} />
                  <span>{room.name} · capacity {room.capacity}</span>
                </label>
              ))}
            </fieldset>

            {supportedAmenities.length > 0 ? (
              <fieldset className="manager-booking-group">
                <legend>Amenities (optional)</legend>
                {supportedAmenities.map((amenity) => (
                  <label className="manager-booking-option" key={amenity.id}>
                    <input type="checkbox" checked={amenityIds.includes(amenity.id)} onChange={() => toggleAmenity(amenity.id)} />
                    <span>{amenity.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            <button className="mo-primary-btn" type="submit" disabled={submitting || rooms.length === 0}>
              {submitting ? "Creating…" : "Create booking"}
            </button>
          </form>
        ) : null}
      </div>
    </ManagerLayout>
  );
}
