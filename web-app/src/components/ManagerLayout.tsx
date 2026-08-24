import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "@/styles/manager-dashboard.css";

type IconName =
  | "grid"
  | "calendar"
  | "room"
  | "people"
  | "chart"
  | "bell"
  | "plus"
  | "more"
  | "arrow"
  | "clock"
  | "wifi"
  | "box"
  | "user"
  | "settings"
  | "chevron-down"
  | "chevron-right"
  | "search"
  | "filter";

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" {...common} />
        <rect x="14" y="3" width="7" height="7" rx="1" {...common} />
        <rect x="3" y="14" width="7" height="7" rx="1" {...common} />
        <rect x="14" y="14" width="7" height="7" rx="1" {...common} />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" {...common} />
        <path d="M8 3v4M16 3v4M3 10h18" {...common} />
      </>
    ),
    room: (
      <>
        <path d="M4 21V5a2 2 0 012-2h9a2 2 0 012 2v16" {...common} />
        <path d="M4 21h16" {...common} />
        <path d="M8 8h3M8 12h3" {...common} />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" {...common} />
        <path d="M3 21v-2a5 5 0 015-5h2a5 5 0 015 5v2" {...common} />
        <path d="M17 5.5a3 3 0 010 5" {...common} />
        <path d="M20 21v-2a5 5 0 00-3-4.58" {...common} />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" {...common} />
        <path d="M4 19h17" {...common} />
        <path d="M8 16v-4" {...common} />
        <path d="M13 16V8" {...common} />
        <path d="M18 16V5" {...common} />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} />
        <path d="M10 22h4" {...common} />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" {...common} />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" {...common} strokeWidth={3} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...common} />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" {...common} />
        <path d="M12 6v6l4 2" {...common} />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.55a11 11 0 0114.08 0" {...common} />
        <path d="M1.42 9a16 16 0 0121.16 0" {...common} />
        <path d="M8.53 16.11a6 6 0 016.94 0" {...common} />
        <circle cx="12" cy="20" r="1" {...common} />
      </>
    ),
    box: (
      <>
        <path
          d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
          {...common}
        />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" {...common} />
        <path d="M12 22.08V12" {...common} />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" {...common} />
        <circle cx="12" cy="7" r="4" {...common} />
      </>
    ),
    settings: (
      <>
        <path
          d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
          {...common}
        />
        <circle cx="12" cy="12" r="3" {...common} />
      </>
    ),
    "chevron-down": <path d="M6 9l6 6 6-6" {...common} />,
    "chevron-right": <path d="M9 18l6-6-6-6" {...common} />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" {...common} />
        <path d="M21 21l-4.3-4.3" {...common} />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" {...common} />,
  };

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  badge?: string;
}

interface NavCategory {
  label: string;
  icon: IconName;
  items: NavItem[];
}

const navConfig: Record<string, NavCategory> = {
  dashboard: {
    label: "Dashboard",
    icon: "grid",
    items: [{ id: "overview", label: "Overview", icon: "grid", path: "/manager/dashboard" }],
  },
  bookings: {
    label: "Bookings",
    icon: "calendar",
    items: [
      { id: "all-bookings", label: "All Bookings", icon: "calendar", path: "/manager/bookings" },
      { id: "queue", label: "Preparation Queue", icon: "clock", path: "/manager/queue", badge: "3" },
    ],
  },
  facilities: {
    label: "Facilities",
    icon: "room",
    items: [
      { id: "spaces", label: "Spaces", icon: "room", path: "/manager/spaces" },
      { id: "add-space", label: "Add Space", icon: "plus", path: "/manager/spaces/create" },
      { id: "amenities", label: "Amenities", icon: "wifi", path: "/manager/amenities" },
    ],
  },
  operations: {
    label: "Operations",
    icon: "box",
    items: [
      { id: "inventory", label: "Inventory", icon: "box", path: "/manager/inventory" },
      { id: "reports", label: "Reports", icon: "chart", path: "/manager/reports" },
    ],
  },
  settings: {
    label: "Settings",
    icon: "settings",
    items: [{ id: "profile", label: "Profile", icon: "user", path: "/manager/profile" }],
  },
};

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["dashboard", "bookings", "facilities"])
  );

  // Auto-expand the category that matches the current route
  useEffect(() => {
    const activeCategory = Object.entries(navConfig).find(([, category]) =>
      category.items.some((item) => location.pathname.startsWith(item.path))
    );
    if (activeCategory) {
      setExpandedCategories((prev) => new Set(prev).add(activeCategory[0]));
    }
  }, [location.pathname]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const isActive = (path: string) => {
    if (path === "/manager/dashboard") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const today = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="manager-dashboard">
      <aside className="manager-sidebar">
        <Link className="manager-brand" to="/manager/dashboard" aria-label="BookSpace dashboard">
          <div className="manager-brand-row">
            <span className="manager-brand-mark">B</span>
            <span className="manager-brand-name">BookSpace</span>
          </div>
          <span className="manager-role-badge">Manager</span>
        </Link>

        {/* Side search bar removed */}

        <nav className="manager-nav" aria-label="Manager navigation">
          {Object.entries(navConfig).map(([categoryId, category]) => (
            <div key={categoryId} className="manager-nav-category">
              <button
                className="manager-nav-category-toggle"
                onClick={() => toggleCategory(categoryId)}
                aria-expanded={expandedCategories.has(categoryId)}
              >
                <Icon name={category.icon} size={18} />
                <span>{category.label}</span>
                <Icon
                  name={expandedCategories.has(categoryId) ? "chevron-down" : "chevron-right"}
                  size={16}
                />
              </button>

              {expandedCategories.has(categoryId) && (
                <div className="manager-nav-items">
                  {category.items.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={isActive(item.path) ? "active" : ""}
                    >
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="manager-sidebar-bottom">
          <div className="manager-help">
            <span>?</span>
            <div>
              <strong>Need a hand?</strong>
              <small>Visit the help centre</small>
            </div>
          </div>
          <div className="manager-profile">
            <span className="manager-avatar">LM</span>
            <div>
              <strong>Lerato Mokoena</strong>
              <small>Operations manager</small>
            </div>
            <button className="manager-profile-menu" aria-label="Profile menu">
              <Icon name="more" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="manager-main">
        <header className="manager-topbar">
          <button className="manager-mobile-brand" type="button" aria-label="Open navigation">
            <span>BookSpace</span>
          </button>

          <div className="manager-date">
            <span>{today}</span>
            <strong>Workspace overview</strong>
          </div>

          <div className="manager-top-actions">
            <div className="manager-search-mobile">
              <Icon name="search" size={18} />
            </div>

            <button
              type="button"
              className="manager-notifications"
              onClick={() => setNoticeOpen((v) => !v)}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              <i />
            </button>

            {noticeOpen && (
              <div className="manager-notice" role="status">
                You have 2 bookings awaiting review.
              </div>
            )}

            <button type="button" className="manager-create" onClick={() => navigate("/manager/bookings")}>
              <Icon name="plus" size={18} />
              New booking
            </button>
          </div>
        </header>

        <section className="manager-content">{children}</section>
      </main>
    </div>
  );
}
