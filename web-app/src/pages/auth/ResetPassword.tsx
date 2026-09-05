import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";

interface Requirement {
  label: string;
  test: (value: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unmet = useMemo(
    () => REQUIREMENTS.filter((req) => !req.test(password)),
    [password]
  );
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (unmet.length > 0) {
      setError("Your password doesn't meet all the requirements yet.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: replace with real call, e.g. await api.resetPassword(token, password)
      await new Promise((resolve) => setTimeout(resolve, 900));
      navigate("/reset-success");
    } catch {
      setError("We couldn't reset your password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Set a new password</h1>
      <p className="auth-subtitle">Choose a strong password you haven't used before.</p>

      {error && (
        <div className="auth-banner auth-banner-error" role="alert" style={{ marginBottom: 18 }}>
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div>
          <PasswordInput
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <ul className="auth-requirements">
            {REQUIREMENTS.map((req) => {
              const met = req.test(password);
              return (
                <li key={req.label} className={met ? "met" : undefined}>
                  <span className="req-dot" aria-hidden="true">
                    {met && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {req.label}
                </li>
              );
            })}
          </ul>
        </div>

        <PasswordInput
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={
            confirmPassword.length > 0 && !passwordsMatch ? "Passwords don't match." : undefined
          }
        />

        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting && <span className="auth-spinner" aria-hidden="true" />}
          {submitting ? "Resetting password…" : "Reset password"}
        </button>
      </form>
    </AuthLayout>
  );
}
