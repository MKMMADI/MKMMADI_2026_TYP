import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "@/styles/field-app.css";

type RoleMode = "clerk" | "employee";

interface NavItem {
  to: string;
  label: string;
  match: (path: string) => boolean;
  icon: ReactNode;
}

function IconQueue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

const clerkNav: NavItem[] = [
  {
    to: "/operations",
    label: "Queue",
    match: (p) => p === "/operations" || p.startsWith("/operations/queue"),
    icon: <IconQueue />,
  },
  {
    to: "/operations/stock",
    label: "Stock",
    match: (p) => p.startsWith("/operations/stock"),
    icon: <IconBox />,
  },
  {
    to: "/operations/profile",
    label: "Profile",
    match: (p) => p.startsWith("/operations/profile"),
    icon: <IconUser />,
  },
];

const employeeNav: NavItem[] = [
  {
    to: "/dashboard",
    label: "Home",
    match: (p) => p === "/dashboard",
    icon: <IconHome />,
  },
  {
    to: "/dashboard/bookings",
    label: "Bookings",
    match: (p) => p.startsWith("/dashboard/bookings"),
    icon: <IconCalendar />,
  },
  {
    to: "/dashboard/profile",
    label: "Profile",
    match: (p) => p.startsWith("/dashboard/profile"),
    icon: <IconUser />,
  },
];

interface OpsLayoutProps {
  children: ReactNode;
  /** Defaults to clerk; employee uses the same visual system */
  mode?: RoleMode;
  title?: string;
}

export default function OpsLayout({ children, mode = "clerk", title }: OpsLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = mode === "employee" ? employeeNav : clerkNav;
  const roleLabel = mode === "employee" ? "Employee" : "Clerk";
  const homePath = mode === "employee" ? "/dashboard" : "/operations";

  function signOut() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }

  return (
    <div className="field-app">
      <header className="field-topbar">
        <Link to={homePath} className="field-brand" aria-label="BookSpace home">
          <span className="field-brand-mark">B</span>
          <span className="field-brand-text">
            <span className="field-brand-name">BookSpace</span>
            <span className="field-brand-role">{roleLabel}</span>
          </span>
        </Link>
        <button type="button" className="field-btn field-btn--ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      <main className="field-main">
        {title && <h1 className="field-page-title">{title}</h1>}
        {children}
      </main>

      <nav className="field-bottom-nav" aria-label={`${roleLabel} navigation`}>
        <div className="field-bottom-nav-inner">
          {nav.map((item) => {
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`field-nav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
