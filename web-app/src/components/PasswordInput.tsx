import { useId, useState } from "react";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  placeholder?: string;
  id?: string;
  hideLabel?: boolean;
}

export default function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  error,
  placeholder = "••••••••",
  id: externalId,
  hideLabel = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      {!hideLabel && (
        <label className="auth-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="auth-input-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="auth-input has-toggle"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          required
        />
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 3L21 21M10.6 10.6a2.5 2.5 0 003.5 3.5M9.4 5.4A9.7 9.7 0 0112 5c5 0 9 4.5 10 7-.4 1.1-1.2 2.5-2.4 3.7M6.3 6.9C4.5 8.1 3.1 9.9 2 12c1 2.5 5 7 10 7 1.3 0 2.5-.3 3.6-.7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p className="auth-error-text" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
