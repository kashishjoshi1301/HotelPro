import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../api/dashboard';
import { formatDate } from './BookingModal';
import { STATUS_BADGE } from './BookingModal';
import { formatINR } from '../utils/formatCurrency';

const StatCard = ({ icon, label, value, color, sub }) => (
  <div className="col-6 col-md-4 col-lg-2">
    <div className="bg-white rounded-3 p-3 shadow-sm h-100 d-flex flex-column">
      <div className={`d-inline-flex align-items-center justify-content-center rounded-3 bg-${color}-subtle text-${color} mb-2`}
        style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="fw-bold fs-4 lh-1 mb-1">{value}</div>
      <div className="text-muted small lh-sm">{label}</div>
      {sub && <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>{sub}</div>}
    </div>
  </div>
);

const AdminDashboard = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getAdminDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Failed to load admin dashboard.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-dark text-white border-0 px-4 py-3">
            <div>
              <h5 className="modal-title font-serif fw-bold mb-0">
                <i className="bi bi-bar-chart-fill brand-accent me-2"></i>Admin Dashboard
              </h5>
              <p className="text-white-50 small mb-0">System overview & metrics</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button onClick={load} className="btn btn-outline-light btn-sm px-2 py-1" title="Refresh">
                <i className="bi bi-arrow-clockwise"></i>
              </button>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          <div className="modal-body p-4 bg-light">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="alert alert-danger small py-2 px-3">{error}</div>
            )}

            {!loading && data && (
              <div className="d-flex flex-column gap-4">
                {/* Metrics */}
                <div className="row g-3">
                  <StatCard icon="bi-buildings" label="Total Rooms" value={data.totalRooms} color="dark" />
                  <StatCard icon="bi-check-circle" label="Available Rooms" value={data.availableRooms} color="success" />
                  <StatCard icon="bi-door-open" label="Occupied Rooms" value={data.occupiedRooms} color="info" />
                  <StatCard icon="bi-calendar2-check" label="Total Bookings" value={data.totalBookings} color="primary" />
                  <StatCard
                    icon="bi-currency-rupee"
                    label="Total Revenue"
                    value={formatINR(data.totalRevenue || 0)}
                    color="warning"
                    sub="Paid bookings only"
                  />
                  <StatCard
                    icon="bi-speedometer2"
                    label="Occupancy"
                    value={`${data.occupancyPercent}%`}
                    color="danger"
                  />
                </div>

                {/* Occupancy Bar */}
                <div className="bg-white rounded-3 p-4 shadow-sm">
                  <div className="d-flex justify-content-between mb-2">
                    <h6 className="font-serif fw-bold mb-0">Room Occupancy</h6>
                    <span className="small text-muted">{data.occupiedRooms} / {data.totalRooms} rooms occupied</span>
                  </div>
                  <div className="progress" style={{ height: '12px', borderRadius: '8px' }}>
                    <div
                      className="progress-bar bg-warning"
                      style={{ width: `${data.occupancyPercent}%`, borderRadius: '8px', transition: 'width 0.5s ease' }}
                      role="progressbar"
                      aria-valuenow={data.occupancyPercent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>

                {/* Recent Bookings */}
                <div className="bg-white rounded-3 p-4 shadow-sm">
                  <h6 className="font-serif fw-bold mb-3">
                    <i className="bi bi-clock-history brand-accent me-2"></i>Recent Bookings
                  </h6>
                  {data.recentBookings?.length === 0 ? (
                    <p className="text-muted small mb-0">No bookings yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle small mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Guest</th>
                            <th>Room</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentBookings.map((b) => (
                            <tr key={b._id}>
                              <td>
                                <div className="fw-semibold">{b.user?.name || '—'}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{b.user?.email}</div>
                              </td>
                              <td>
                                <div>{b.room?.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{b.room?.roomNumber}</div>
                              </td>
                              <td>{formatDate(b.checkIn)}</td>
                              <td>{formatDate(b.checkOut)}</td>
                              <td className="fw-semibold">{formatINR(b.totalAmount)}</td>
                              <td>
                                <span className={`badge ${STATUS_BADGE[b.bookingStatus] || 'bg-secondary-subtle text-secondary'}`}>
                                  {b.bookingStatus}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${b.paymentStatus === 'paid' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}`}>
                                  {b.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
