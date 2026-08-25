import { useState, useEffect } from "react";
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

  return (
    <ManagerLayout>
      <div className="mo-page">
        <div className="mo-header">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Reports</h1>
            <p className="mo-subtitle">Space usage, availability, and popularity over a date range.</p>
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

            <h3 className="mo-section-title">Room usage</h3>
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

            {(usage.departmentUsage || []).length > 0 && (
              <>
                <h3 className="mo-section-title">By department</h3>
                <div className="mo-table-wrap">
                  <table className="mo-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Bookings</th>
                        <th>Hours</th>
                        <th>Employees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.departmentUsage.map((d: any) => (
                        <tr key={d.department}>
                          <td>{d.department}</td>
                          <td>{d.bookings}</td>
                          <td>{d.totalHours}</td>
                          <td>{d.uniqueEmployees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
