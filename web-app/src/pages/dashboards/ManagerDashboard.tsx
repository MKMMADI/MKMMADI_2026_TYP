import { useState } from "react";
import "@/styles/manager-dashboard.css";

type IconName = 
  | "grid" | "calendar" | "room" | "people" | "chart" | "bell" 
  | "plus" | "more" | "arrow" | "clock" | "wifi" | "box" 
  | "user" | "settings" | "chevron-down" | "chevron-right" 
  | "search" | "filter" | "edit" | "trash" | "check" | "x";

function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" {...common} /><rect x="14" y="3" width="7" height="7" rx="1" {...common} /><rect x="3" y="14" width="7" height="7" rx="1" {...common} /><rect x="14" y="14" width="7" height="7" rx="1" {...common} /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...common} /><path d="M8 3v4M16 3v4M3 10h18" {...common} /></>,
    room: <><path d="M4 21V5a2 2 0 012-2h9a2 2 0 012 2v16M4 21h16M8 8h3M8 12h3" {...common} /></>,
    people: <><circle cx="9" cy="8" r="3" {...common} /><path d="M3 21v-2a5 5 0 015-5h2a5 5 0 015 5v2M17 5.5a3 3 0 010 5M20 21v-2a5 5 0 00-3-4.58" {...common} /></>,
    chart: <><path d="M4 19V5M4 19h17M8 16v-4M13 16V8M18 16V5" {...common} /></>,
    bell: <><path d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" {...common} /></>,
    plus: <path d="M12 5v14M5 12h14" {...common} />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" {...common} strokeWidth={3} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...common} />,
    clock: <><circle cx="12" cy="12" r="10" {...common} /><path d="M12 6v6l4 2" {...common} /></>,
    wifi: <><path d="M5 12.55a11 11 0 0114.08 0" {...common} /><path d="M1.42 9a16 16 0 0121.16 0" {...common} /><path d="M8.53 16.11a6 6 0 016.94 0" {...common} /><circle cx="12" cy="20" r="1" {...common} /></>,
    box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" {...common} /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" {...common} /></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" {...common} /><circle cx="12" cy="7" r="4" {...common} /></>,
    settings: <><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" {...common} /><circle cx="12" cy="12" r="3" {...common} /></>,
    "chevron-down": <path d="M6 9l6 6 6-6" {...common} />,
    "chevron-right": <path d="M9 18l6-6-6-6" {...common} />,
    search: <><circle cx="11" cy="11" r="8" {...common} /><path d="M21 21l-4.35-4.35" {...common} /></>,
    filter: <><path d="M4 6h16M6 12h12M8 18h8" {...common} /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" {...common} /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...common} /></>,
    trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" {...common} /></>,
    check: <path d="M20 6L9 17l-5-5" {...common} />,
    x: <><line x1="18" y1="6" x2="6" y2="18" {...common} /><line x1="6" y1="6" x2="18" y2="18" {...common} /></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const navConfig: Record<string, { label: string; icon: IconName; items: NavItem[] }> = {
  dashboard: {
    label: "Dashboard",
    icon: "grid" as IconName,
    items: [
      { id: "overview", label: "Overview", icon: "grid" as IconName, path: "/manager/dashboard" }
    ]
  },
  bookings: {
    label: "Bookings",
    icon: "calendar" as IconName,
    items: [
      { id: "all-bookings", label: "All Bookings", icon: "calendar" as IconName, path: "/manager/bookings" },
      { id: "queue", label: "Preparation Queue", icon: "clock" as IconName, path: "/manager/queue", badge: "3" }
    ]
  },
  facilities: {
    label: "Facilities",
    icon: "room" as IconName,
    items: [
      { id: "spaces", label: "Spaces", icon: "room" as IconName, path: "/manager/spaces" },
      { id: "add-space", label: "Add Space", icon: "plus" as IconName, path: "/manager/spaces/create" },
      { id: "amenities", label: "Amenities", icon: "wifi" as IconName, path: "/manager/amenities" }
    ]
  },
  operations: {
    label: "Operations",
    icon: "box" as IconName,
    items: [
      { id: "inventory", label: "Inventory", icon: "box" as IconName, path: "/manager/inventory" },
      { id: "reports", label: "Reports", icon: "chart" as IconName, path: "/manager/reports" }
    ]
  },
  settings: {
    label: "Settings",
    icon: "settings" as IconName,
    items: [
      { id: "profile", label: "Profile", icon: "user" as IconName, path: "/manager/profile" }
    ]
  }
};


// Navigation configuration
interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  badge?: string; // Make badge optional
}

interface NavCategory {
  label: string;
  icon: IconName;
  items: NavItem[];
}

// Updated: Recent bookings data (more relevant for manager)
const recentBookings = [
  { 
    id: "BK-2024-001",
    time: "09:00 - 10:30", 
    title: "Quarterly Planning Session", 
    employee: "Thandi Mokoena", 
    room: "Atlas Boardroom", 
    status: "confirmed",
    statusColor: "teal"
  },
  { 
    id: "BK-2024-002",
    time: "11:30 - 12:15", 
    title: "Product Design Review", 
    employee: "Noluthando Khumalo", 
    room: "Studio 2", 
    status: "preparing",
    statusColor: "blue"
  },
  { 
    id: "BK-2024-003",
    time: "14:00 - 15:30", 
    title: "Client Strategy Meeting", 
    employee: "Michael Roberts", 
    room: "Horizon Room", 
    status: "ready",
    statusColor: "amber"
  },
  { 
    id: "BK-2024-004",
    time: "16:00 - 17:00", 
    title: "Team Standup", 
    employee: "Sarah Chen", 
    room: "Atlas Boardroom", 
    status: "completed",
    statusColor: "green"
  },
];

const rooms = [
  { name: "Atlas boardroom", capacity: "12 people", state: "In use", tone: "busy" },
  { name: "Studio 2", capacity: "8 people", state: "Available", tone: "available" },
  { name: "Horizon", capacity: "6 people", state: "Available", tone: "available" },
];

export default function ManagerDashboard() {
  const [activeNav, setActiveNav] = useState("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["dashboard", "bookings", "facilities"])
  );
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const today = new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);
    // Here you would navigate using your router
    // router.push(item.path);
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      confirmed: "Confirmed",
      preparing: "Preparing",
      ready: "Ready",
      completed: "Completed",
      cancelled: "Cancelled"
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="manager-dashboard">
      <aside className="manager-sidebar">
        <a className="manager-brand" href="/manager/dashboard" aria-label="BookSpace dashboard">
          <span className="manager-brand-mark">B</span>
          <span>BookSpace</span>
          <span className="manager-role-badge">Manager</span>
        </a>
        
        {/* Search */}
        <div className="manager-nav-search">
          <Icon name="search" size={16} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
                <Icon name={expandedCategories.has(categoryId) ? "chevron-down" : "chevron-right"} size={16} />
              </button>
              {expandedCategories.has(categoryId) && (
                <div className="manager-nav-items">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={activeNav === item.id ? "active" : ""}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </button>
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
            <button type="button" className="manager-notifications" onClick={() => setNoticeOpen((value) => !value)} aria-label="Notifications">
              <Icon name="bell" />
              <i />
            </button>
            {noticeOpen && <div className="manager-notice" role="status">You have 2 bookings awaiting review.</div>}
            <button type="button" className="manager-create">
              <Icon name="plus" size={18} />
              New booking
            </button>
          </div>
        </header>

        <section className="manager-content">
          <div className="manager-welcome">
            <div>
              <p className="manager-kicker">
                {Object.values(navConfig).flatMap(c => c.items).find(i => i.id === activeNav)?.label || "Overview"}
              </p>
              <h1>Good morning, Lerato.</h1>
              <p>Here's what's happening across your spaces today.</p>
            </div>
            <div className="manager-welcome-actions">
              <button type="button" className="manager-outline-button">
                <Icon name="filter" size={16} />
                Filter
              </button>
              <button type="button" className="manager-outline-button">
                View calendar <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <section className="manager-stats" aria-label="Today's statistics">
            <article>
              <span className="manager-stat-icon manager-stat-icon--teal">
                <Icon name="calendar" />
              </span>
              <div>
                <span>Today's bookings</span>
                <strong>18</strong>
                <small className="up">↑ 12% <em>vs. last week</em></small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--violet">
                <Icon name="room" />
              </span>
              <div>
                <span>Space utilisation</span>
                <strong>74%</strong>
                <small className="up">↑ 8% <em>vs. last week</em></small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--amber">
                <Icon name="people" />
              </span>
              <div>
                <span>Active members</span>
                <strong>126</strong>
                <small className="neutral">+9 <em>this month</em></small>
              </div>
            </article>
            <article>
              <span className="manager-stat-icon manager-stat-icon--green">
                <Icon name="box" />
              </span>
              <div>
                <span>Low stock items</span>
                <strong>4</strong>
                <small className="down">⚠️ <em>needs attention</em></small>
              </div>
            </article>
          </section>

          <div className="manager-grid">
            {/* REPLACED: Recent Bookings Section (was Today's Schedule) */}
            <section className="manager-panel manager-recent-bookings">
              <div className="manager-panel-header">
                <div>
                  <h2>Recent Bookings</h2>
                  <p>Today's upcoming and ongoing meetings</p>
                </div>
                <button type="button">View all <Icon name="arrow" size={16} /></button>
              </div>
              <div className="manager-recent-bookings-list">
                {recentBookings.map((booking) => (
                  <article key={booking.id} className="manager-booking-item">
                    <div className="manager-booking-time">
                      <strong>{booking.time}</strong>
                    </div>
                    <div className="manager-booking-info">
                      <h3>{booking.title}</h3>
                      <p>
                        <span className="manager-booking-employee">{booking.employee}</span>
                        <span className="manager-booking-room">· {booking.room}</span>
                      </p>
                    </div>
                    <div className="manager-booking-status-wrapper">
                      <span className={`manager-booking-status ${booking.statusColor}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <button type="button" aria-label={`More options for ${booking.title}`}>
                      <Icon name="more" size={18} />
                    </button>
                  </article>
                ))}
              </div>
              <div className="manager-booking-summary">
                <div className="manager-summary-item">
                  <span className="summary-dot confirmed"></span>
                  <span>Confirmed: 8</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot preparing"></span>
                  <span>Preparing: 3</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot ready"></span>
                  <span>Ready: 5</span>
                </div>
                <div className="manager-summary-item">
                  <span className="summary-dot completed"></span>
                  <span>Completed: 12</span>
                </div>
              </div>
            </section>

            {/* Spaces Section */}
            <section className="manager-panel manager-spaces">
              <div className="manager-panel-header">
                <div>
                  <h2>Spaces at a glance</h2>
                  <p>Live availability</p>
                </div>
                <button type="button">Manage spaces</button>
              </div>
              {rooms.map((room) => (
                <article className="manager-room" key={room.name}>
                  <span className="manager-room-art">
                    <Icon name="room" />
                  </span>
                  <div>
                    <h3>{room.name}</h3>
                    <p>{room.capacity}</p>
                  </div>
                  <span className={`manager-status ${room.tone}`}>{room.state}</span>
                </article>
              ))}
              <button type="button" className="manager-room-footer">
                See all spaces <Icon name="arrow" size={16} />
              </button>
            </section>
          </div>

          {/* Insights Section */}
          <section className="manager-panel manager-insights">
            <div>
              <p className="manager-kicker">Weekly insight</p>
              <h2>Your spaces are working harder.</h2>
              <p>Space usage is up 8% this week, led by Atlas boardroom and Studio 2.</p>
              <button type="button">View insights <Icon name="arrow" size={16} /></button>
            </div>
            <div className="manager-bars" aria-label="Space usage chart">
              <span style={{ height: "45%" }} />
              <span style={{ height: "61%" }} />
              <span style={{ height: "53%" }} />
              <span style={{ height: "78%" }} />
              <span style={{ height: "72%" }} />
              <span className="current" style={{ height: "90%" }} />
            </div>
          </section>

          {/* Quick Actions */}
          <div className="manager-quick-actions">
            <h3>Quick Actions</h3>
            <div className="manager-quick-action-grid">
              <button className="quick-action-card">
                <Icon name="plus" size={24} />
                <span>New Room</span>
              </button>
              <button className="quick-action-card">
                <Icon name="wifi" size={24} />
                <span>Add Amenity</span>
              </button>
              <button className="quick-action-card">
                <Icon name="box" size={24} />
                <span>Update Stock</span>
              </button>
              <button className="quick-action-card">
                <Icon name="chart" size={24} />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}