import { Link } from "react-router-dom";
import OpsLayout from "@/components/OpsLayout";

export default function EmployeeHome() {
  return (
    <OpsLayout mode="employee">
      <div className="field-hero-card">
        <h2>Find a space</h2>
        <p>Book meeting rooms that match your time, capacity, and amenities.</p>
      </div>

      <p className="field-page-sub" style={{ marginTop: 0 }}>
        Same mobile layout and colours as the clerk app — only the tasks differ.
      </p>

      <Link to="/dashboard/bookings" className="field-list-link">
        <div>
          <strong>My bookings</strong>
          <span>View and manage your requests</span>
        </div>
        <span aria-hidden>→</span>
      </Link>

      <div className="field-list-link" style={{ opacity: 0.85 }}>
        <div>
          <strong>New booking</strong>
          <span>Coming in the employee booking sprint</span>
        </div>
      </div>
    </OpsLayout>
  );
}
