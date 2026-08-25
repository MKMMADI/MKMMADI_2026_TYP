import { useState, useEffect, useMemo, type FormEvent } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-operations.css";

interface Consumable {
  id: number;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
}

export default function ManagerInventory() {
  const [items, setItems] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [qty, setQty] = useState("0");
  const [reorder, setReorder] = useState("5");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Consumable | null>(null);
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Consumable[]>("/consumables");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (lowOnly && i.quantityOnHand > i.reorderLevel) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q);
    });
  }, [items, search, lowOnly]);

  const lowCount = items.filter((i) => i.quantityOnHand <= i.reorderLevel).length;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) {
      setFormError("Name and unit are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await apiFetch<Consumable>("/consumables", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim(),
          quantityOnHand: Number(qty) || 0,
          reorderLevel: Number(reorder) || 5,
        }),
      });
      setItems((prev) => [created, ...prev]);
      setCreateOpen(false);
      setName("");
      setUnit("unit");
      setQty("0");
      setReorder("5");
      setToast(`"${created.name}" added to inventory.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    const delta = Number(change);
    if (!Number.isFinite(delta) || delta === 0) {
      setAdjustError("Enter a non-zero quantity change (e.g. -2 or 10).");
      return;
    }
    if (!reason.trim()) {
      setAdjustError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setAdjustError(null);
    try {
      const result = await apiFetch<{ item: Consumable }>(`/consumables/${adjustTarget.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ quantityChange: delta, reason: reason.trim() }),
      });
      setItems((prev) => prev.map((i) => (i.id === adjustTarget.id ? result.item : i)));
      setAdjustTarget(null);
      setChange("");
      setReason("");
      setToast(`Stock updated for "${result.item.name}".`);
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : "Could not adjust stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ManagerLayout>
      <div className="mo-page">
        <div className="mo-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Inventory</h1>
            <p className="mo-subtitle">Track consumables and stock levels for meeting prep.</p>
          </div>
          <button type="button" className="mo-primary-btn" onClick={() => setCreateOpen(true)}>
            + Add item
          </button>
        </div>

        <div className="mo-summary">
          <div className="mo-summary-card">
            <span>Total items</span>
            <strong>{items.length}</strong>
          </div>
          <div className={`mo-summary-card ${lowCount > 0 ? "mo-summary-card--warn" : ""}`}>
            <span>Low stock</span>
            <strong>{lowCount}</strong>
          </div>
        </div>

        <div className="mo-toolbar">
          <label className="mo-check">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
            Low stock only
          </label>
          <div className="mo-search">
            <input
              type="search"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="mo-state">
            <p>Loading inventory…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mo-state mo-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>On hand</th>
                  <th>Reorder at</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mo-empty">
                      No items found.
                    </td>
                  </tr>
                )}
                {filtered.map((item) => {
                  const low = item.quantityOnHand <= item.reorderLevel;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span className="mo-unit">{item.unit}</span>
                      </td>
                      <td>
                        <strong>{item.quantityOnHand}</strong>
                      </td>
                      <td>{item.reorderLevel}</td>
                      <td>
                        <span className={`mo-badge ${low ? "mo-badge--low" : "mo-badge--ok"}`}>
                          {low ? "Low stock" : "OK"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mo-btn mo-btn--ghost"
                          onClick={() => {
                            setAdjustTarget(item);
                            setChange("");
                            setReason("");
                            setAdjustError(null);
                          }}
                        >
                          Adjust stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="mo-modal-overlay" onClick={() => setCreateOpen(false)} role="presentation">
          <div className="mo-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Add inventory item</h2>
            <form onSubmit={handleCreate}>
              <label className="mo-field">
                <span>Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="mo-field">
                <span>Unit *</span>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pack, box, litre…" required />
              </label>
              <div className="mo-field-row">
                <label className="mo-field">
                  <span>Qty on hand</span>
                  <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
                </label>
                <label className="mo-field">
                  <span>Reorder level</span>
                  <input type="number" min={0} value={reorder} onChange={(e) => setReorder(e.target.value)} />
                </label>
              </div>
              {formError && <p className="mo-error">{formError}</p>}
              <div className="mo-form-actions">
                <button type="button" className="manager-outline-button" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="mo-primary-btn" disabled={submitting}>
                  {submitting ? "Saving…" : "Save item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="mo-modal-overlay" onClick={() => setAdjustTarget(null)} role="presentation">
          <div className="mo-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Adjust stock</h2>
            <p className="mo-modal-meta">
              {adjustTarget.name} · currently {adjustTarget.quantityOnHand} {adjustTarget.unit}
            </p>
            <form onSubmit={handleAdjust}>
              <label className="mo-field">
                <span>Quantity change *</span>
                <input
                  type="number"
                  value={change}
                  onChange={(e) => setChange(e.target.value)}
                  placeholder="e.g. -2 or +10"
                  required
                />
              </label>
              <label className="mo-field">
                <span>Reason *</span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Issued to Atlas / Delivery received…"
                  required
                />
              </label>
              {adjustError && <p className="mo-error">{adjustError}</p>}
              <div className="mo-form-actions">
                <button type="button" className="manager-outline-button" onClick={() => setAdjustTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="mo-primary-btn" disabled={submitting}>
                  {submitting ? "Saving…" : "Apply adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="mo-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
