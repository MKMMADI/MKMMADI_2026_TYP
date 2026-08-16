import type { Booking } from "@/types/booking";

export default function BookingChecklist({ booking }: { booking: Booking }) {
  return (
    <div className="checklist">
      <h3>{booking.purpose}</h3>
      <p>Employee: {booking.employee.name}</p>
      <ul>
        <li>Room unlocked/clean</li>
        <li>Projector tested</li>
        <li>Whiteboard ready</li>
        {booking.amenities.map(a => (
          <li key={a.id}>{a.name} ready</li>
        ))}
      </ul>
    </div>
  );
}
