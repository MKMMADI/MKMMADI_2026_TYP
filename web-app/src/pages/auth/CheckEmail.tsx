import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";

export default function CheckEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "your email address";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    // TODO: replace with real call, e.g. await api.requestPasswordReset(email)
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResending(false);
    setResent(true);
  };

  return (
    <AuthLayout>
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

      <h1 className="auth-title">Check your email</h1>
      <p className="auth-subtitle">
        We've sent a password reset link to <strong>{email}</strong>. The link expires in 30
        minutes.
      </p>

      <button
        type="button"
        className="auth-button-secondary"
        onClick={handleResend}
        disabled={resending}
      >
        {resending ? "Resending…" : resent ? "Link sent again" : "Resend link"}
      </button>

      <p className="auth-footer">
        Wrong email? <Link to="/forgot-password" className="auth-inline-link">Try again</Link>
      </p>
    </AuthLayout>
  );
}
