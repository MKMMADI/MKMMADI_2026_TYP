import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";

export default function ResetSuccess() {
  return (
    <AuthLayout>
      <div className="auth-success-badge" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="auth-title">Password reset</h1>
      <p className="auth-subtitle">
        Your password has been updated. Use your new password the next time you sign in.
      </p>

      <Link to="/login" className="auth-button" style={{ textDecoration: "none" }}>
        Continue to sign in
      </Link>
    </AuthLayout>
  );
}
