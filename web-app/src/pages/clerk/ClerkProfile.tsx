import OpsLayout from "@/components/OpsLayout";

export default function ClerkProfile() {
  return (
    <OpsLayout mode="clerk">
      <h1 className="field-page-title">Profile</h1>
      <p className="field-page-sub">Your account details for the operations app.</p>
      <div className="field-card">
        <h3>Clerk account</h3>
        <p className="field-meta">
          Profile editing will match the employee profile screen so both roles share the same form
          patterns and tokens.
        </p>
      </div>
    </OpsLayout>
  );
}
