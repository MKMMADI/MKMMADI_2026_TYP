import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import {login , getCurrentUser} from "@/lib/auth"

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Enter your email and password to continue.");
      return;
    }

   setSubmitting(true);

    try {
      const tokens = await login(email.trim().toLowerCase(), password);

      // Development-only approach. Prefer an HttpOnly refresh-token cookie in production.
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("accessToken", tokens.accessToken);
      storage.setItem("refreshToken", tokens.refreshToken);

      const user = await getCurrentUser(tokens.accessToken);

      const destination =
        user.role === "MANAGER"
          ? "/manager/dashboard"
          : user.role === "CLERK"
            ? "/operations"
            : "/dashboard";

      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't sign you in. Check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Sign in</h1>
      <p className="auth-subtitle">Welcome back. Enter your details to continue.</p>

      {formError && (
        <div className="auth-banner auth-banner-error" role="alert" style={{ marginBottom: 18 }}>
          {formError}
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
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field-label-row">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <Link to="/forgot-password" className="auth-inline-link">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            label="Password"
            hideLabel
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>

        <div className="auth-checkbox-row">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember">Keep me signed in</label>
        </div>

        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting && <span className="auth-spinner" aria-hidden="true" />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-footer">
        Don't have an account? <Link to="/signup" className="auth-inline-link">Create one</Link>
      </p>
    </AuthLayout>
  );
}
