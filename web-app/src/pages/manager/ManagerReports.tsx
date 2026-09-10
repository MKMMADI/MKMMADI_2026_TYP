import { useState, useEffect, useMemo } from "react";
import ManagerLayout from "@/components/ManagerLayout";
import { apiFetch } from "@/lib/api";
import "@/styles/manager-operations.css";

type ReportTab = "usage" | "availability" | "popularity";

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}

function formatShortDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

/** Horizontal bar chart from label/value pairs */
function BarChart({
  title,
  items,
  valueKey = "value",
  labelKey = "label",
  unit = "",
}: {
  title: string;
  items: Record<string, unknown>[];
  valueKey?: string;
  labelKey?: string;
  unit?: string;
}) {
  const max = useMemo(() => {
    const nums = items.map((i) => Number(i[valueKey]) || 0);
    return Math.max(...nums, 1);
  }, [items, valueKey]);

  if (!items.length) {
    return (
      <div className="mo-chart">
        <h3 className="mo-section-title">{title}</h3>
        <p className="mo-chart-empty">No data for this period.</p>
      </div>
    );
  }

  return (
    <div className="mo-chart">
      <h3 className="mo-section-title">{title}</h3>
      <ul className="mo-bar-list" aria-label={title}>
        {items.map((item, idx) => {
          const value = Number(item[valueKey]) || 0;
          const label = String(item[labelKey] ?? "");
          const pct = Math.round((value / max) * 100);
          return (
            <li key={`${label}-${idx}`} className="mo-bar-row">
              <span className="mo-bar-label" title={label}>
                {label}
              </span>
              <div className="mo-bar-track">
                <div
                  className="mo-bar-fill"
                  style={{ width: `${pct}%` }}
                  title={`${value}${unit}`}
                />
              </div>
              <span className="mo-bar-value">
                {value}
                {unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Vertical column chart for daily series */
function ColumnChart({
  title,
  points,
}: {
  title: string;
  points: { date: string; bookings: number; totalHours?: number }[];
}) {
  const max = Math.max(...points.map((p) => p.bookings), 1);

  if (!points.length) {
    return (
      <div className="mo-chart">
        <h3 className="mo-section-title">{title}</h3>
        <p className="mo-chart-empty">No data for this period.</p>
      </div>
    );
  }

  // Cap visual density: sample if many days
  const shown =
    points.length > 21
      ? points.filter((_, i) => i % Math.ceil(points.length / 21) === 0)
      : points;

  return (
    <div className="mo-chart">
      <h3 className="mo-section-title">{title}</h3>
      <div className="mo-columns" role="img" aria-label={title}>
        {shown.map((p) => {
          const h = Math.max(4, Math.round((p.bookings / max) * 100));
          return (
            <div key={p.date} className="mo-column">
              <div className="mo-column-bar-wrap">
                <div
                  className="mo-column-bar"
                  style={{ height: `${h}%` }}
                  title={`${p.date}: ${p.bookings} bookings`}
                />
              </div>
              <span className="mo-column-label">{formatShortDate(p.date)}</span>
              <span className="mo-column-val">{p.bookings}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ManagerReports() {
  const range = defaultRange();
  const [tab, setTab] = useState<ReportTab>("usage");
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [popularity, setPopularity] = useState<any>(null);

  async function load() {
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    setLoading(true);
    setError(null);
    const q = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    try {
      const [u, a, p] = await Promise.all([
        apiFetch(`/reports/usage${q}`),
        apiFetch(`/reports/availability${q}`),
        apiFetch(`/reports/popularity${q}&limit=10`),
      ]);
      setUsage(u);
      setAvailability(a);
      setPopularity(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roomHoursBars = useMemo(() => {
    if (!usage?.roomUsage) return [];
    return [...usage.roomUsage]
      .sort((a: any, b: any) => b.totalHours - a.totalHours)
      .map((r: any) => ({ label: r.roomName, value: r.totalHours }));
  }, [usage]);

  const deptBars = useMemo(() => {
    if (!usage?.departmentUsage) return [];
    return [...usage.departmentUsage]
      .sort((a: any, b: any) => b.bookings - a.bookings)
      .map((d: any) => ({ label: d.department, value: d.bookings }));
  }, [usage]);

  const dailyPoints = useMemo(() => {
    if (usage?.dailyTrend?.length) return usage.dailyTrend;
    if (availability?.dailyBreakdown?.length) {
      return availability.dailyBreakdown.map((d: any) => ({
        date: d.date,
        bookings: d.bookings,
      }));
    }
    return [];
  }, [usage, availability]);

  const popularityBars = useMemo(() => {
    if (!popularity?.topRooms) return [];
    return popularity.topRooms.map((r: any) => ({
      label: r.roomName,
      value: r.totalBookings,
    }));
  }, [popularity]);

  const freeVsBooked = useMemo(() => {
    if (!availability?.dailyBreakdown?.length) return [];
    // average free / booked over period for a simple comparison chart
    const days = availability.dailyBreakdown;
    const avgBooked =
      days.reduce((s: number, d: any) => s + (d.roomsBooked || 0), 0) / days.length;
    const avgFree =
      days.reduce((s: number, d: any) => s + (d.roomsAvailable || 0), 0) / days.length;
    return [
      { label: "Avg rooms booked / day", value: Math.round(avgBooked * 10) / 10 },
      { label: "Avg rooms free / day", value: Math.round(avgFree * 10) / 10 },
    ];
  }, [availability]);

  return (
    <ManagerLayout>
      <div className="mo-page">
        <div className="mo-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Reports</h1>
            <p className="mo-subtitle">
              Space usage trends, availability, and room popularity — with charts for the selected
              range.
            </p>
          </div>
        </div>

        <div className="mo-report-controls">
          <label className="mo-field mo-field--inline">
            <span>From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="mo-field mo-field--inline">
            <span>To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <button type="button" className="mo-primary-btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Run reports"}
          </button>
        </div>

        <div className="mo-tabs">
          {(
            [
              ["usage", "Usage"],
              ["availability", "Availability"],
              ["popularity", "Popularity"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mo-state mo-state--error">
            <p>{error}</p>
          </div>
        )}

        {loading && !usage && (
          <div className="mo-state">
            <p>Generating reports…</p>
          </div>
        )}

        {!loading && !error && tab === "usage" && usage && (
          <>
            <div className="mo-summary">
              <div className="mo-summary-card">
                <span>Bookings</span>
                <strong>{usage.summary?.totalBookings ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Hours booked</span>
                <strong>{usage.summary?.totalHoursBooked ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Rooms used</span>
                <strong>{usage.summary?.totalRoomsUsed ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Unique employees</span>
                <strong>{usage.summary?.uniqueEmployees ?? 0}</strong>
              </div>
            </div>

            <ColumnChart title="Bookings per day" points={dailyPoints} />
            <BarChart title="Hours by room" items={roomHoursBars} unit="h" />
            {deptBars.length > 0 && (
              <BarChart title="Bookings by department" items={deptBars} />
            )}

            <h3 className="mo-section-title">Room usage detail</h3>
            <div className="mo-table-wrap">
              <table className="mo-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Bookings</th>
                    <th>Hours</th>
                    <th>Avg duration</th>
                    <th>People</th>
                  </tr>
                </thead>
                <tbody>
                  {(usage.roomUsage || []).map((r: any) => (
                    <tr key={r.roomId}>
                      <td>
                        <strong>{r.roomName}</strong>
                      </td>
                      <td>{r.bookings}</td>
                      <td>{r.totalHours}</td>
                      <td>{r.averageDuration}h</td>
                      <td>{r.uniqueEmployees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && tab === "availability" && availability && (
          <>
            <div className="mo-summary">
              <div className="mo-summary-card">
                <span>Total rooms</span>
                <strong>{availability.summary?.totalRooms ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Available</span>
                <strong>{availability.summary?.availableRooms ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Maintenance</span>
                <strong>{availability.summary?.maintenanceRooms ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Bookings in period</span>
                <strong>{availability.summary?.totalBookingsInPeriod ?? 0}</strong>
              </div>
            </div>

            <ColumnChart
              title="Daily bookings"
              points={(availability.dailyBreakdown || []).map((d: any) => ({
                date: d.date,
                bookings: d.bookings,
              }))}
            />
            <BarChart title="Average rooms booked vs free" items={freeVsBooked} />

            <h3 className="mo-section-title">Daily breakdown</h3>
            <div className="mo-table-wrap">
              <table className="mo-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bookings</th>
                    <th>Rooms booked</th>
                    <th>Rooms free</th>
                  </tr>
                </thead>
                <tbody>
                  {(availability.dailyBreakdown || []).map((d: any) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.bookings}</td>
                      <td>{d.roomsBooked}</td>
                      <td>{d.roomsAvailable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && tab === "popularity" && popularity && (
          <>
            <div className="mo-summary">
              <div className="mo-summary-card">
                <span>Total bookings</span>
                <strong>{popularity.summary?.totalBookings ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Rooms used</span>
                <strong>{popularity.summary?.totalRoomsUsed ?? 0}</strong>
              </div>
              <div className="mo-summary-card">
                <span>Avg bookings / room</span>
                <strong>{popularity.summary?.averageBookingsPerRoom ?? 0}</strong>
              </div>
            </div>

            <BarChart title="Top rooms by bookings" items={popularityBars} />

            <h3 className="mo-section-title">Top rooms</h3>
            <div className="mo-table-wrap">
              <table className="mo-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Room</th>
                    <th>Score</th>
                    <th>Bookings</th>
                    <th>Hours</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(popularity.topRooms || []).map((r: any) => (
                    <tr key={r.roomId}>
                      <td>{r.rank}</td>
                      <td>
                        <strong>{r.roomName}</strong>
                      </td>
                      <td>{r.popularityScore}</td>
                      <td>{r.totalBookings}</td>
                      <td>{r.totalHours}</td>
                      <td className="mo-trend">{r.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ManagerLayout>
  );
}
