import { Link } from "react-router-dom";

/**
 * Placeholder brand mark. Swap the SVG below for your real logo file
 * (e.g. import logoUrl from "@/assets/logo.svg" and render an <img>).
 */
export default function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      to="/login"
      className={`auth-logo${inverse ? " auth-logo--inverse" : ""}`}
      aria-label="Go to BookSpace sign in"
    >
      <svg
        className="auth-logo-mark"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#2A9D8F" />
        <path
          d="M10 21V11L16 17L22 11V21"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="auth-logo-wordmark">BookSpace</span>
    </Link>
  );
}
