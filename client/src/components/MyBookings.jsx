import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../api/bookings';
import { STATUS_BADGE, formatDate } from './BookingModal';
import { formatINR } from '../utils/formatCurrency';

const MyBookings = ({ isOpen, onClose }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setLoading(true);
    getMyBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load your reservations. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleCancel = async (bookingId) => {
    setCancelError('');
    setCancellingId(bookingId);
    try {
      const res = await cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? res.data.booking : b))
      );
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Failed to cancel this reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-dark text-white border-0 px-4 py-3">
            <div>
              <h5 className="modal-title font-serif fw-bold mb-0">My Reservations</h5>
              <p className="text-white-50 small mb-0">View and manage your stay history</p>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted small mt-3">Loading your reservations...</p>
              </div>
            )}

            {!loading && error && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle me-1"></i> {error}
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
                <h6 className="fw-bold text-secondary">No reservations yet</h6>
                <p className="text-muted small">Browse our suites and book your first luxury stay.</p>
                <button className="btn btn-hotelpro-gold btn-sm px-4 mt-1" onClick={onClose}>
                  Explore Rooms
                </button>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {cancelError && (
                  <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle me-1"></i> {cancelError}
                  </div>
                )}

                {bookings.map((booking) => (
                  <div key={booking._id} className="border rounded-4 overflow-hidden">
                    <div className="row g-0">
                      {booking.room?.image && (
                        <div className="col-4 col-md-3">
                          <img
                            src={booking.room.image}
                            alt={booking.room?.title}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover', minHeight: '110px' }}
                          />
                        </div>
                      )}
                      <div className={booking.room?.image ? 'col-8 col-md-9' : 'col-12'}>
                        <div className="p-3">
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                            <div>
                              <h6 className="fw-bold font-serif mb-0">{booking.room?.title || 'Room'}</h6>
                              <small className="text-muted">{booking.room?.category}</small>
                            </div>
                            <span className={`badge px-2 py-1 ${STATUS_BADGE[booking.bookingStatus] || 'bg-secondary-subtle text-secondary'}`}>
                              {booking.bookingStatus?.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                          </div>

                          <div className="row g-2 mb-2 text-sm">
                            <div className="col-auto small text-muted">
                              <i className="bi bi-calendar-event me-1"></i>
                              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="small text-muted">
                              <i className="bi bi-people me-1"></i>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                              &nbsp;&bull;&nbsp;
                              <i className="bi bi-moon-stars me-1"></i>{booking.nights} night{booking.nights !== 1 ? 's' : ''}
                              &nbsp;&bull;&nbsp;
                              <strong className="text-dark">{formatINR(booking.totalAmount)}</strong>
                            </div>

                            {booking.bookingStatus === 'confirmed' && (
                              <button
                                className="btn btn-outline-danger btn-sm px-3 rounded-pill"
                                onClick={() => handleCancel(booking._id)}
                                disabled={cancellingId === booking._id}
                              >
                                {cancellingId === booking._id ? (
                                  <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-x-circle me-1"></i>
                                )}
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
