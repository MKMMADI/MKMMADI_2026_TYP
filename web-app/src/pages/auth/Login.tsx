import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { useLogin } from "@/hooks/useLogin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const { signIn, submitting, error: formError, setError: setFormError } = useLogin(remember);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Enter your email and password to continue.");
      return;
    }

    try {
      await signIn(email, password);
    } catch {
      // The hook exposes the error for rendering.
    }
  };

  return (
    <AuthLayout showHero>
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
            placeholder="you@bookspace.com"
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
        Need access? <a href="mailto:admin@bookspace.com" className="auth-inline-link">Contact your administrator</a>
      </p>
    </AuthLayout>
  );
}
