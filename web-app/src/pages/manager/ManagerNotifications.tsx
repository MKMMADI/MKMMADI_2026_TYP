import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import { FALLBACK_REASONS, type RejectionReason } from "@/lib/bookingRejection";
import "@/styles/manager-bookings.css";
import "@/styles/manager-notifications.css";

type NotificationCategory = "bookings" | "inventory" | "messages";
type CategoryFilter = "all" | NotificationCategory;

interface ManagerBookingAlert {
  id: number;
  purpose: string;
  startAt: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  status: "PENDING" | "RESCHEDULE_REQUIRED" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  employee: {
    id?: number;
    employeeId?: string;
    name: string;
    email?: string;
    role?: string;
    officialRole?: string | null;
    department?: string | null;
    contactNumber?: string | null;
  };
  rooms: { room: { id?: number; name: string; capacity?: number } }[];
  amenities?: { amenity: { id?: number; name: string } }[];
}

interface LowStockItem {
  id: number;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  updatedAt: string;
}

interface ConversationPreview {
  id: number;
  participant: { name: string };
  unreadCount: number;
  lastMessage: { body: string; createdAt: string } | null;
}

interface NotificationItem {
  id: string;
  category: NotificationCategory;
  categoryLabel: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  priority: "high" | "medium";
  priorityLabel: string;
  actionLabel: string;
  href: string;
  unreadCount?: number;
  booking?: ManagerBookingAlert;
}

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All categories",
  bookings: "Bookings",
  inventory: "Inventory",
  messages: "Messages",
};

function getDefaultDateRange() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { start: toDateInputValue(weekAgo), end: toDateInputValue(today) };
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildNotifications(
  bookings: ManagerBookingAlert[],
  lowStockItems: LowStockItem[],
  conversations: ConversationPreview[],
): NotificationItem[] {
  const notifications: NotificationItem[] = [];

  bookings.forEach((booking) => {
    const isDisplaced = booking.status === "RESCHEDULE_REQUIRED";
    notifications.push({
      id: `booking-${booking.id}`,
      category: "bookings",
      categoryLabel: "Booking",
      icon: "📅",
      title: booking.purpose,
      description: isDisplaced
        ? `Schedule changed · ${booking.employee.name} · ${booking.rooms.map(({ room }) => room.name).join(", ")}`
        : `Awaiting review · ${booking.employee.name} · ${booking.rooms.map(({ room }) => room.name).join(", ")}`,
      timestamp: isDisplaced ? booking.updatedAt : booking.createdAt,
      priority: isDisplaced ? "high" : "medium",
      priorityLabel: isDisplaced ? "Schedule change" : "Needs review",
      actionLabel: isDisplaced ? "Review booking" : "Review booking",
      href: "/manager/bookings",
      booking,
    });
  });

  lowStockItems.forEach((item) => {
    notifications.push({
      id: `inventory-${item.id}`,
      category: "inventory",
      categoryLabel: "Inventory",
      icon: "📦",
      title: item.name,
      description: `${item.quantityOnHand} ${item.quantityOnHand === 1 ? item.unit.replace(/s$/, "") : item.unit} remaining · reorder level ${item.reorderLevel}`,
      timestamp: item.updatedAt,
      priority: item.quantityOnHand === 0 ? "high" : "medium",
      priorityLabel: item.quantityOnHand === 0 ? "Out of stock" : "Low stock",
      actionLabel: "View inventory",
      href: "/manager/inventory",
    });
  });

  conversations.forEach((conversation) => {
    if (conversation.unreadCount <= 0 || !conversation.lastMessage) return;
    notifications.push({
      id: `message-${conversation.id}-${conversation.lastMessage.createdAt}`,
      category: "messages",
      categoryLabel: "Message",
      icon: "✉️",
      title: conversation.participant.name,
      description: conversation.lastMessage.body,
      timestamp: conversation.lastMessage.createdAt,
      priority: "high",
      priorityLabel: "Unread",
      actionLabel: "Open messages",
      href: "/manager/messages",
      unreadCount: conversation.unreadCount,
    });
  });

  return notifications.sort((first, second) =>
    (notificationDate(second.timestamp)?.getTime() ?? 0) -
    (notificationDate(first.timestamp)?.getTime() ?? 0),
  );
}

export default function ManagerNotifications() {
  const defaultDateRange = useMemo(getDefaultDateRange, []);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [startDate, setStartDate] = useState(defaultDateRange.start);
  const [endDate, setEndDate] = useState(defaultDateRange.end);
  const [selectedBooking, setSelectedBooking] = useState<ManagerBookingAlert | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState(FALLBACK_REASONS);
  const [reasonCode, setReasonCode] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      setLoading(true);
      const results = await Promise.allSettled([
        apiFetch<ManagerBookingAlert[]>("/bookings"),
        apiFetch<LowStockItem[]>("/consumables/low-stock"),
        apiFetch<ConversationPreview[]>("/conversations"),
      ]);

      if (!active) return;
      const nextErrors: string[] = [];
      const [bookingResult, stockResult, conversationResult] = results;
      const bookingData = bookingResult.status === "fulfilled" && Array.isArray(bookingResult.value)
        ? bookingResult.value
        : [];
      const stockData = stockResult.status === "fulfilled" && Array.isArray(stockResult.value)
        ? stockResult.value
        : [];
      const conversationData = conversationResult.status === "fulfilled" && Array.isArray(conversationResult.value)
        ? conversationResult.value
        : [];

      if (bookingResult.status === "rejected") {
        nextErrors.push(`Bookings: ${bookingResult.reason instanceof Error ? bookingResult.reason.message : "Could not load booking updates"}`);
      }
      if (stockResult.status === "rejected") {
        nextErrors.push(`Inventory: ${stockResult.reason instanceof Error ? stockResult.reason.message : "Could not load stock alerts"}`);
      }
      if (conversationResult.status === "rejected") {
        nextErrors.push(`Messages: ${conversationResult.reason instanceof Error ? conversationResult.reason.message : "Could not load message previews"}`);
      }

      setNotifications(buildNotifications(bookingData, stockData, conversationData));
      setErrors(nextErrors);
      setLoading(false);
    }

    void loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => ({
    all: notifications.length,
    bookings: notifications.filter((item) => item.category === "bookings").length,
    inventory: notifications.filter((item) => item.category === "inventory").length,
    messages: notifications.filter((item) => item.category === "messages").length,
  }), [notifications]);

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return notifications.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (term && !`${item.title} ${item.description} ${item.categoryLabel}`.toLocaleLowerCase().includes(term)) return false;
      const date = notificationDate(item.timestamp);
      if (date && start && date < start) return false;
      if (date && end && date > end) return false;
      return true;
    });
  }, [notifications, search, category, startDate, endDate]);

  const hasFilters = Boolean(
    search || category !== "all" ||
    startDate !== defaultDateRange.start || endDate !== defaultDateRange.end,
  );
  const categoryOptions: CategoryFilter[] = ["all", "bookings", "inventory", "messages"];

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setStartDate(defaultDateRange.start);
    setEndDate(defaultDateRange.end);
    setFeedback(null);
  }

  function closeBookingReview() {
    if (actionId !== null) return;
    setSelectedBooking(null);
    setActionError(null);
    setRejecting(false);
    setReasonCode("");
    setRejectNote("");
  }

  async function approveBooking() {
    if (!selectedBooking || actionId !== null) return;
    const booking = selectedBooking;
    setActionId(booking.id);
    setActionError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/approve`, { method: "PATCH" });
      setNotifications((current) => current.filter((item) => item.id !== `booking-${booking.id}`));
      setSelectedBooking(null);
      setFeedback(`Booking approved. ${booking.employee.name} will be notified.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not approve booking");
    } finally {
      setActionId(null);
    }
  }

  async function openRejectionForm() {
    if (!selectedBooking) return;
    setRejecting(true);
    setActionError(null);
    setReasonCode("");
    setRejectNote("");
    try {
      const reasons = await apiFetch<RejectionReason[]>("/bookings/rejection-reasons");
      if (!Array.isArray(reasons) || reasons.length === 0) {
        throw new Error("No rejection reasons are available.");
      }
      setRejectionReasons(reasons);
    } catch (reason) {
      setActionError(
        `Could not load rejection reasons: ${reason instanceof Error ? reason.message : "Unknown error"}. Standard reasons are shown.`,
      );
      setRejectionReasons(FALLBACK_REASONS);
    }
  }

  async function rejectBooking() {
    if (!selectedBooking || actionId !== null) return;
    if (!reasonCode) {
      setActionError("Please select a reason.");
      return;
    }
    if (reasonCode === "OTHER" && !rejectNote.trim()) {
      setActionError("Please add a short note when choosing Other.");
      return;
    }
    const booking = selectedBooking;
    setActionId(booking.id);
    setActionError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reasonCode, note: rejectNote.trim() || undefined }),
      });
      setNotifications((current) => current.filter((item) => item.id !== `booking-${booking.id}`));
      setSelectedBooking(null);
      setRejecting(false);
      setFeedback(`Booking rejected. ${booking.employee.name} will be notified.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not reject booking");
    } finally {
      setActionId(null);
    }
  }

  return (
    <ManagerLayout>
      <div className="manager-notifications-page">
        <header className="mb-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Notifications</h1>
            <p className="mb-subtitle">Review booking requests, stock alerts, and unread messages.</p>
          </div>
        </header>

        <div className="mb-summary" aria-label="Notification totals by category">
          <div className="mb-summary-card">
            <span>Total notifications</span>
            <strong className="manager-notification-total">
              {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
            </strong>
          </div>
          <div className="mb-summary-card">
            <span>Bookings</span>
            <strong>{counts.bookings}</strong>
          </div>
          <div className="mb-summary-card">
            <span>Inventory</span>
            <strong>{counts.inventory}</strong>
          </div>
          <div className="mb-summary-card">
            <span>Messages</span>
            <strong>{counts.messages}</strong>
          </div>
        </div>

        <div className="filter-card">
          <div className="filter-content">
            <label className="notification-search-wrapper">
              <span aria-hidden="true">🔍</span>
              <input
                className="notification-search-input"
                type="search"
                aria-label="Filter notifications"
                placeholder="Search notifications..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="notification-filter-field">
              <span className="sr-only">Filter by category</span>
              <select
                aria-label="Filter by category"
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              >
                {categoryOptions.map((option) => (
                  <option value={option} key={option}>{CATEGORY_LABELS[option]}</option>
                ))}
              </select>
            </label>
            <label className="notification-filter-field">
              <span>Start date</span>
              <input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="notification-filter-field">
              <span>End date</span>
              <input
                aria-label="End date"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            {hasFilters ? (
              <button type="button" className="notification-clear-filters" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
          {feedback ? <p className="mb-toast" role="status">{feedback}</p> : null}
        </div>

        {!loading && notifications.length > 0 ? (
          <p className="notification-results-count" role="status">
            {filteredNotifications.length} {filteredNotifications.length === 1 ? "notification" : "notifications"}
          </p>
        ) : null}

        {errors.map((error) => <p className="manager-alert-error" role="alert" key={error}>{error}</p>)}
        {loading ? (
          <div className="notification-card empty-state" role="status">
            <p>Loading notifications...</p>
          </div>
        ) : null}
        {!loading && notifications.length === 0 && errors.length === 0 ? (
          <div className="notification-card empty-state">
            <p>No notifications to show.</p>
          </div>
        ) : null}
        {!loading && notifications.length > 0 && filteredNotifications.length === 0 ? (
          <div className="notification-card empty-state">
            <p>No matching notifications found.</p>
          </div>
        ) : null}
        {!loading && filteredNotifications.map((item) => (
          <article
            className={`notification-card${item.category === "messages" ? " message" : ""}`}
            key={item.id}
          >
            <div className="card-header">
              <div className="card-left">
                <span className="card-icon" aria-hidden="true">{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.categoryLabel}</p>
                </div>
              </div>
              <div className="card-right">
                <span className={`category-badge badge-${item.priority}`}>{item.priorityLabel}</span>
                {item.unreadCount ? <span className="notification-unread-count">{item.unreadCount} unread</span> : null}
                <time className="timestamp" dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
              </div>
            </div>
            <div className="card-content">
              <p>{item.description}</p>
            </div>
            <div className="card-actions">
              {item.booking ? (
                <button
                  className="btn-action"
                  type="button"
                  onClick={() => {
                    setSelectedBooking(item.booking ?? null);
                    setActionError(null);
                    setRejecting(false);
                    setFeedback(null);
                  }}
                >
                  {item.actionLabel}
                </button>
              ) : (
                <Link className="btn-action" to={item.href}>{item.actionLabel}</Link>
              )}
            </div>
          </article>
        ))}

        {selectedBooking ? (
          <div className="mb-modal-overlay" role="presentation" onClick={closeBookingReview}>
            <section
              className="mb-modal mb-booking-review-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-review-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="mb-modal-close"
                aria-label="Close booking review"
                onClick={closeBookingReview}
                disabled={actionId !== null}
              >
                ×
              </button>
              <h2 id="booking-review-title">Review booking</h2>
              <p className="mb-modal-meta">
                <strong>{selectedBooking.purpose}</strong>
                <span>{selectedBooking.employee.name} · {formatTimestamp(selectedBooking.startAt)}</span>
                {selectedBooking.endAt ? <span>Ends {formatTimestamp(selectedBooking.endAt)}</span> : null}
                <span>Status: {selectedBooking.status.replaceAll("_", " ").toLocaleLowerCase()}</span>
              </p>
              <dl className="mb-booking-review-details">
                <div><dt>Employee ID</dt><dd>{selectedBooking.employee.employeeId || "Not provided"}</dd></div>
                <div><dt>Department</dt><dd>{selectedBooking.employee.department || "Not provided"}</dd></div>
                <div><dt>Contact</dt><dd>{selectedBooking.employee.contactNumber || "Not provided"}</dd></div>
                <div>
                  <dt>Role</dt>
                  <dd>{selectedBooking.employee.officialRole?.replaceAll("_", " ") || selectedBooking.employee.role || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Rooms</dt>
                  <dd>{selectedBooking.rooms.map(({ room }) => room.name).join(", ") || "None"}</dd>
                </div>
                <div>
                  <dt>Amenities</dt>
                  <dd>{selectedBooking.amenities?.map(({ amenity }) => amenity.name).join(", ") || "None"}</dd>
                </div>
              </dl>

              {actionError ? <p className="mb-modal-error" role="alert">{actionError}</p> : null}
              {selectedBooking.status === "PENDING" && rejecting ? (
                <>
                  <label className="mb-field">
                    <span>Reason *</span>
                    <select
                      aria-label="Reason *"
                      value={reasonCode}
                      onChange={(event) => setReasonCode(event.target.value)}
                      disabled={actionId !== null}
                    >
                      <option value="">Select a reason…</option>
                      {rejectionReasons.map((reason) => (
                        <option key={reason.code} value={reason.code}>{reason.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="mb-field">
                    <span>Optional note{reasonCode === "OTHER" ? " *" : ""}</span>
                    <textarea
                      rows={3}
                      aria-label="Optional note"
                      placeholder="Add context for the employee…"
                      value={rejectNote}
                      onChange={(event) => setRejectNote(event.target.value)}
                      disabled={actionId !== null}
                    />
                  </label>
                  <div className="mb-modal-actions">
                    <button
                      type="button"
                      className="manager-outline-button"
                      onClick={() => { setRejecting(false); setActionError(null); }}
                      disabled={actionId !== null}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="mb-btn mb-btn--reject-solid"
                      onClick={() => void rejectBooking()}
                      disabled={actionId !== null}
                    >
                      {actionId === selectedBooking.id ? "Rejecting…" : "Confirm rejection"}
                    </button>
                  </div>
                </>
              ) : selectedBooking.status === "PENDING" ? (
                <div className="mb-modal-actions">
                  <button
                    type="button"
                    className="mb-btn mb-btn--reject"
                    onClick={() => void openRejectionForm()}
                    disabled={actionId !== null}
                  >
                    Reject booking
                  </button>
                  <button
                    type="button"
                    className="mb-btn mb-btn--approve"
                    onClick={() => void approveBooking()}
                    disabled={actionId !== null}
                  >
                    {actionId === selectedBooking.id ? "Approving…" : "Approve booking"}
                  </button>
                </div>
              ) : (
                <div className="mb-modal-actions">
                  <Link className="manager-outline-button" to="/manager/bookings" onClick={closeBookingReview}>
                    Open bookings
                  </Link>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </ManagerLayout>
  );
}
