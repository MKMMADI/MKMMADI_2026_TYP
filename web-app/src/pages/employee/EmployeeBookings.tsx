import OpsLayout from "@/components/OpsLayout";

export default function EmployeeBookings() {
  return (
    <OpsLayout mode="employee">
      <h1 className="field-page-title">My bookings</h1>
      <p className="field-page-sub">Your pending, confirmed, and past requests will list here.</p>
      <div className="field-state">
        <p>Booking list and request flow will be added in the employee sprint.</p>
      </div>
    </OpsLayout>
  );
}
