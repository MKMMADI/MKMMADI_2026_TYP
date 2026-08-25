import { useState, useEffect, type FormEvent } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-operations.css";

interface Profile {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  contactNumber: string | null;
  createdAt: string;
  Active: boolean;
}

export default function ManagerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Profile>("/me");
      setProfile(data);
      setName(data.name || "");
      setDepartment(data.department || "");
      setContactNumber(data.contactNumber || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Profile>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          department: department.trim() || null,
          contactNumber: contactNumber.trim() || null,
        }),
      });
      setProfile(updated);
      setToast("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (profile?.name || "?")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <ManagerLayout>
      <div className="mo-page mo-page--narrow">
        <div className="mo-header">
          <div>
            <p className="manager-kicker">Settings</p>
            <h1>Profile</h1>
            <p className="mo-subtitle">Your account details for BookSpace.</p>
          </div>
        </div>

        {loading && (
          <div className="mo-state">
            <p>Loading profile…</p>
          </div>
        )}

        {error && !loading && !profile && (
          <div className="mo-state mo-state--error">
            <p>{error}</p>
            <button type="button" className="manager-outline-button" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {!loading && profile && (
          <div className="mo-profile">
            <div className="mo-profile-hero">
              <span className="mo-avatar">{initials}</span>
              <div>
                <strong>{profile.name}</strong>
                <p>{profile.email}</p>
                <span className="mo-role-pill">{profile.role}</span>
              </div>
            </div>

            <form className="mo-form" onSubmit={handleSave}>
              <label className="mo-field">
                <span>Full name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>

              <label className="mo-field">
                <span>Email</span>
                <input value={profile.email} disabled />
                <small className="mo-hint">Email cannot be changed here.</small>
              </label>

              <label className="mo-field">
                <span>Department</span>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Facilities & Operations"
                />
              </label>

              <label className="mo-field">
                <span>Contact number</span>
                <input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+27 …"
                />
              </label>

              {error && <p className="mo-error">{error}</p>}

              <div className="mo-form-actions">
                <button type="submit" className="mo-primary-btn" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {toast && (
        <div className="mo-toast" role="status">
          {toast}
        </div>
      )}
    </ManagerLayout>
  );
}
