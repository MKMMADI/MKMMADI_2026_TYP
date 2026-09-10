import OpsLayout from "@/components/OpsLayout";

export default function EmployeeProfile() {
  return (
    <OpsLayout mode="employee">
      <h1 className="field-page-title">Profile</h1>
      <p className="field-page-sub">Your account details.</p>
      <div className="field-card">
        <h3>Employee account</h3>
        <p className="field-meta">Shared profile patterns with the clerk app for consistent UX.</p>
      </div>
    </OpsLayout>
  );
}
