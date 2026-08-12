import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: replace with real call, e.g. await api.requestPasswordReset(email)
      await new Promise((resolve) => setTimeout(resolve, 900));
      navigate("/check-email", { state: { email } });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="auth-back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5M5 12L12 19M5 12L12 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to sign in
      </Link>

      <div className="auth-icon-badge" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M3 7L12 13L21 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-subtitle">
        Enter the email associated with your account and we'll send you a link to reset your
        password.
      </p>

      {error && (
        <div className="auth-banner auth-banner-error" role="alert" style={{ marginBottom: 18 }}>
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(error)}
            required
          />
        </div>

        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting && <span className="auth-spinner" aria-hidden="true" />}
          {submitting ? "Sending link…" : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
