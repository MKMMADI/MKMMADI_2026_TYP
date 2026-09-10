import OpsLayout from "@/components/OpsLayout";

export default function ClerkStock() {
  return (
    <OpsLayout mode="clerk">
      <h1 className="field-page-title">Stock</h1>
      <p className="field-page-sub">
        Quick adjustments when you issue consumables during prep. Full inventory levels stay with
        managers — this screen will list low/out items and simple ± adjust in the next sprint.
      </p>
      <div className="field-state">
        <p>Stock actions coming next. Use the queue for room preparation today.</p>
      </div>
    </OpsLayout>
  );
}
